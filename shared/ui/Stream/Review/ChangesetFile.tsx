import React from "react";
import { ReviewChangesetFileInfo, FileStatus } from "@codestream/protocols/api";
import styled from "styled-components";
import Tooltip from "../Tooltip";
import cx from "classnames";

interface Props {
	className?: string;
	onClick?: React.MouseEventHandler;
	selected?: boolean;
	noHover?: boolean;
	icon?: any;
	actionIcons?: any;
	tooltip?: any;
}

export const ChangesetFile = styled((props: ReviewChangesetFileInfo & Props) => {
	const { linesAdded, linesRemoved, status } = props;

	return (
		<div
			className={cx("row-with-icon-actions monospace ellipsis-left-container", props.className, {
				selected: props.selected,
				"no-hover": props.noHover,
				"with-file-icon": props.icon,
				"with-action-icons": !!props.actionIcons
			})}
			onClick={props.onClick}
		>
			{props.icon}
			<Tooltip title={props.tooltip} placement="bottom" delay={1}>
				<span className="file-info ellipsis-left">
					<bdi dir="ltr">{props.file}</bdi>
				</span>
			</Tooltip>
			{linesAdded > 0 && <span className="added">+{linesAdded} </span>}
			{linesRemoved > 0 && <span className="deleted">-{linesRemoved}</span>}
			{status === FileStatus.untracked && <span className="added">new </span>}
			{status === FileStatus.added && <span className="added">added </span>}
			{status === FileStatus.copied && <span className="added">copied </span>}
			{status === FileStatus.unmerged && <span className="deleted">conflict </span>}
			{status === FileStatus.deleted && <span className="deleted">deleted </span>}
			{props.actionIcons}
		</div>
	);
})`
	width: 100%;
`;
