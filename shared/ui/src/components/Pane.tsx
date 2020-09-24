import React, { PropsWithChildren } from "react";
import styled from "styled-components";
import Icon from "@codestream/webview/Stream/Icon";
import ScrollBox from "@codestream/webview/Stream/ScrollBox";
import { useDispatch, useSelector } from "react-redux";
import { CodeStreamState } from "@codestream/webview/store";
import { WebviewPanels } from "@codestream/protocols/webview";
import {
	setUserPreference,
	setPaneCollapsed,
	setPaneMaximized
} from "@codestream/webview/Stream/actions";
import Draggable from "react-draggable";
import { DragHeaderContext } from "@codestream/webview/Stream/Sidebar";

export enum PaneState {
	Open = "open",
	Minimized = "minimized",
	Collapsed = "collapsed",
	Removed = "removed"
}

const EMPTY_HASH = {};

export const NoContent = styled.div`
	color: var(--text-color-subtle);
	margin: 0 20px 5px 20px;
	font-size: 12px;
`;

interface PaneNodeNameProps {
	title: string | React.ReactNode;
	id?: string;
	className?: string;
	onClick?: any;
	isLoading?: boolean;
	count?: number;
	subtitle?: string | React.ReactNode;
	collapsed?: boolean;
	actionsVisibleIfOpen?: boolean;
}
export const PaneNodeName = styled((props: PropsWithChildren<PaneNodeNameProps>) => {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const { preferences } = state;
		const hiddenPaneNodes = preferences.hiddenPaneNodes || EMPTY_HASH;
		return {
			collapsed: props.id ? hiddenPaneNodes[props.id] : props.collapsed
		};
	});
	const toggleNode = e => {
		if (e.target.closest(".actions")) return;
		if (!props.id) return;
		dispatch(setUserPreference(["hiddenPaneNodes"], { [props.id]: !derivedState.collapsed }));
	};

	return (
		<div className={props.className} onClick={props.onClick || toggleNode}>
			<div className="label">
				{props.isLoading && <Icon name="sync" className="spin" />}
				{!props.isLoading && (
					<Icon
						name={derivedState.collapsed ? "chevron-right-thin" : "chevron-down-thin"}
						className="expander"
					/>
				)}
				{props.title}
				{props.count && props.count > 0 ? <span className="subtle"> ({props.count})</span> : null}
				{!derivedState.collapsed && props.subtitle ? (
					<span className="subtle"> {props.subtitle}</span>
				) : null}
			</div>
			{!derivedState.collapsed && <div className="actions">{props.children}</div>}
		</div>
	);
})`
	padding: 2px 10px 2px 20px;
	display: flex;
	cursor: pointer;
	position: relative;
	.label {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	> .icon {
		display: inline-block;
		width: 16px;
		text-align: center;
	}
	&:hover {
		background: var(--app-background-color-hover);
		color: var(--text-color-highlight);
	}
	.actions {
		text-align: right;
		// position: absolute;
		// right: 5px;
		// top: 2px;
		white-space: nowrap;
		margin-left: auto;
		display: ${props => (props.actionsVisibleIfOpen ? "block" : "none")};
		.icon {
			margin: 0 5px;
			opacity: 0.7;
		}
	}
	&:hover .actions {
		// background: var(--app-background-color-hover);
		display: block;
	}
	.subtle {
		padding-left: 5px;
		font-weight: normal;
		text-transform: none;
	}
`;

export const PaneNode = styled.div`
	.pane-row {
		padding-left: 40px;
		.selected-icon {
			left: 20px;
		}
	}
`;

interface PaneHeaderProps {
	title: string | React.ReactNode;
	className?: string;
	id: WebviewPanels;
	count?: number;
	subtitle?: string | React.ReactNode;
	isLoading?: boolean;
	warning?: React.ReactNode;
}
export const PaneHeader = styled((props: PropsWithChildren<PaneHeaderProps>) => {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const { preferences } = state;
		const panePreferences = preferences.sidebarPanes || EMPTY_HASH;
		const settings = panePreferences[props.id] || EMPTY_HASH;
		const anyMaximized = Object.keys(panePreferences).find(
			id => (panePreferences[id] || {}).maximized
		);
		const stateIcon =
			anyMaximized && !settings.maximized
				? "dash"
				: settings.maximized
				? "chevron-down-thin"
				: settings.collapsed
				? "chevron-right-thin"
				: "chevron-down-thin";
		return {
			stateIcon,
			settings,
			maximized: settings.maximized,
			collapsed: settings.collapsed,
			anyMaximized
		};
	});

	const [dragging, setDragging] = React.useState(false);
	const dragFunctions = React.useContext(DragHeaderContext);

	const togglePanel = e => {
		console.warn("E IS: ", e);
		if (dragging) return;
		if (
			e.target.classList.contains("pane-header") ||
			e.target.classList.contains("label") ||
			e.target.closest(".expander")
		)
			dispatch(setPaneCollapsed(props.id, !derivedState.collapsed));
	};
	const maximize = () => {
		dispatch(setPaneMaximized(props.id, !derivedState.maximized));
	};

	const header = (
		<div className={"pane-header " + props.className} tabIndex={1}>
			<div className="label">
				<Icon name={derivedState.stateIcon} className="expander" />
				{props.title}
				{props.count && props.count > 0 ? <span className="subtle"> ({props.count})</span> : null}
				{!derivedState.collapsed && props.subtitle ? (
					<span className="subtle"> {props.subtitle}</span>
				) : null}
				{props.warning && props.warning}
			</div>
			{!derivedState.collapsed && (!derivedState.anyMaximized || derivedState.maximized) && (
				<div className="actions">
					{props.children}
					<Icon
						name={derivedState.maximized ? "minimize" : "maximize"}
						className="maximize"
						onClick={maximize}
						tabIndex={1}
					/>
				</div>
			)}
			{props.isLoading && (
				<div className="progress-container">
					<div className="progress-bar">
						<div className="progress-cursor" />
					</div>
				</div>
			)}
		</div>
	);

	return (
		<>
			<Draggable
				position={{ x: 0, y: 0 }}
				cancel=".menu-popup"
				onDrag={e => {
					// @ts-ignore
					if (e && e.target && e.target.closest(".menu-popup")) return;
					setDragging(true);
					dragFunctions.drag(e, props.id);
				}}
				onStop={e => {
					// https://github.com/STRML/react-draggable/issues/49
					if (!dragging) togglePanel(e);
					else {
						dragFunctions.stop(e, props.id);
						setDragging(false);
					}
				}}
			>
				{header}
			</Draggable>
			{dragging && header}
		</>
	);
})`
	position: fixed;
	// color: var(--text-color-highlight);

	background: var(--app-background-color);
	background: var(--sidebar-header-background);
	color: var(--sidebar-header-foreground);

	font-weight: 700;
	font-size: 11px;
	text-transform: uppercase;
	margin: -23px 0 5px 0;
	padding-left: 4px;
	padding-top: 1px;
	height: 23px;
	border: 1px solid transparent;
	display: flex;
	.label {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	&:focus {
		border: 1px solid var(--text-focus-border-color);
		outline: none;
	}
	&.react-draggable-dragging {
		border: 1px solid var(--base-border-color);
		padding-top: 2px;
		height: 25px;
		background: var(--base-background-color);
		box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);
		z-index: 10000;
		.actions {
			background: var(--base-background-color);
		}
	}
	.toggle {
		opacity: 0;
		margin: 0 5px 0 -13px;
		vertical-align: -1px;
		transition: opacity 0.1s;
	}
	.maximize svg {
		transform: scale(0.8) rotate(-45deg);
	}
	&:hover .toggle {
		opacity: 1;
	}
	z-index: 49;
	width: calc(100% - 2px);
	cursor: pointer;
	.progress-container {
		position: absolute;
		top: 21px;
	}
	.actions {
		// position: absolute;
		// right: 0;
		// top: 2px;
		display: none;
		margin-right: 7px;
		margin-left: auto;
		// background: var(--app-background-color);
		// background: var(--sidebar-header-background);
		.icon {
			vertical-align: 2px !important;
			cursor: pointer;
			display: inline-block;
			opacity: 0.7;
			&:hover {
				opacity: 1;
			}
			margin: 0px 5px !important;
			padding: 0 !important;
			&:active {
				transform: scale(1.2);
			}
			&.maximize:active {
				transform: scale(1) rotate(-45deg);
			}
		}
	}
	&:focus .actions {
		display: inline;
	}
	.expander {
		vertical-align: 2px;
	}
	.subtle {
		padding-left: 5px;
		font-weight: normal;
		text-transform: none;
	}
`;

interface PaneBodyProps {}
export function PaneBody(props: PropsWithChildren<PaneBodyProps>) {
	return (
		<ScrollBox>
			<div className="vscroll">{props.children}</div>
		</ScrollBox>
	);
}

const Root = styled.div`
	padding: 22px 0 0px 0;
	// border: 1px solid transparent;
	border-bottom: 1px solid var(--sidebar-header-border);
	&.open {
		// border: 3px solid green;
	}
	&.highlightTop::before {
		content: "";
		position: absolute;
		display: block;
		top: -1px;
		left: -1px;
		right: -1px;
		height: 3px;
		background: var(--text-color);
	}
	&.highlightTop.open::before {
		top: 0;
		height: 50%;
		background: rgba(127, 127, 127, 0.25);
	}
	&.highlightBottom::before {
		content: "";
		position: absolute;
		display: block;
		bottom: -1px;
		left: -1px;
		right: -1px;
		height: 3px;
		background: var(--text-color);
	}
	&.highlightBottom.open::before {
		bottom: 0;
		height: 50%;
		background: rgba(127, 127, 127, 0.25);
	}
	.icon {
		&.ticket,
		&.link-external {
			margin-right: 0;
		}
	}
	.instructions {
		display: none;
		padding: 0 20px 20px 20px;
		text-align: center;
	}
	&.show-instructions .instructions {
		display: block;
	}
	&:hover ${PaneHeader} .actions {
		display: inline;
	}
	position: absolute;
	overflow: hidden;
	// width: calc(100% - 2px); // absolute element w/a border
	width: 100%;
	left: 1px;
	.animate-height & {
		transition: height 0.25s, top 0.25s;
	}
	.expander {
		margin: 0 2px 0 -2px;
	}
`;

interface PaneProps {
	className?: string;
	top: number;
	height: number;
	tabIndex: number;
}

export function Pane(props: PropsWithChildren<PaneProps>) {
	return (
		<Root
			className={props.className}
			style={{ top: `${props.top}px`, height: `${props.height}px` }}
		>
			{props.children}
		</Root>
	);
}