import React, { useState, useCallback } from "react";
import { Link } from "../Stream/Link";
import { connect } from "react-redux";
import { FormattedMessage } from "react-intl";
import { goToSignup, SupportedSSOProvider, goToLogin } from "../store/context/actions";
import { useInterval, useRetryingCallback, useTimeout } from "../utilities/hooks";
import { DispatchProp } from "../store/common";
import { inMillis } from "../utils";
import { SignupType, startIDESignin, startSSOSignin, validateSignup } from "./actions";
import { capitalize } from "@codestream/webview/utils";
import { LoginResult } from "@codestream/protocols/api";
import { useDispatch } from "react-redux";

const noop = () => Promise.resolve();

interface Props extends DispatchProp {
	type?: SignupType;
	inviteCode?: string;
	provider: SupportedSSOProvider;
	hostUrl?: string;
	fromSignup?: boolean;
	useIDEAuth?: boolean;
	gotError?: boolean | string;
}

export const ProviderAuth = (connect(undefined) as any)((props: Props) => {
	const [isWaiting, setIsWaiting] = useState(true);
	const dispatch = useDispatch();

	const stopWaiting = useCallback(() => {
		setIsWaiting(false);
	}, [isWaiting]);

	const waitFor = inMillis(300, "sec"); // changed to hopefully avoid timeouts
	useTimeout(stopWaiting, waitFor);

	const onClickGoToSignup = (event: React.SyntheticEvent) => {
		event.preventDefault();
		props.dispatch(goToSignup());
	};

	const onClickTryAgain = (event: React.SyntheticEvent) => {
		event.preventDefault();
		if (props.provider === "github" && props.useIDEAuth) {
			props.dispatch(
				startIDESignin(
					props.provider,
					props.type !== undefined
						? {
								type: props.type,
								inviteCode: props.inviteCode,
								fromSignup: props.fromSignup,
								useIDEAuth: true
						  }
						: undefined
				)
			);
		} else {
			props.dispatch(
				startSSOSignin(
					props.provider,
					props.type !== undefined
						? {
								type: props.type,
								inviteCode: props.inviteCode,
								hostUrl: props.hostUrl,
								fromSignup: props.fromSignup
						  }
						: undefined
				)
			);
		}
		setIsWaiting(true);
	};

	const onClickGoBack = useCallback(
		(event: React.SyntheticEvent) => {
			event.preventDefault();
			switch (props.fromSignup) {
				case true: {
					return dispatch(goToSignup());
				}
				default:
					return dispatch(goToLogin());
			}
		},
		[props.type]
	);

	const validate = useCallback(async () => {
		try {
			await props.dispatch(
				validateSignup(
					capitalize(props.provider),
					props.type !== undefined ? { type: props.type, fromSignup: props.fromSignup } : undefined
				)
			);
		} catch (error) {
			if (error !== LoginResult.TokenNotFound) {
				setIsWaiting(false);
			}
		}
	}, [props.type]);

	useRetryingCallback(isWaiting ? validate : noop);

	// not i8n friendly!!!
	const providerCapitalized = capitalize(props.provider);
	const aOrAn = ["a", "e", "i", "o", "u"].find(letter => props.provider.startsWith(letter))
		? "an"
		: "a";
	// HACK: this sucks ... we really should have access to the actual error info here
	// instead of doing string matching. Facts
	const ideAuthFailure =
		props.gotError &&
		typeof props.gotError === "string" &&
		props.gotError.match("PRVD-105") &&
		props.useIDEAuth;

	return (
		<div className="onboarding-page">
			<form className="standard-form">
				<fieldset className="form-body">
					<div className="border-bottom-box">
						<h2>
							<FormattedMessage id="providerAuth.auth" defaultMessage={`${providerCapitalized} Authentication`}/>
						</h2>
						<p>
							<FormattedMessage id="providerAuth.message" defaultMessage={`Your web browser should have opened up to ${aOrAn} ${providerCapitalized} authentication page. Once you've completed the authentication process, return here to get started with CodeStream.`}/>
						</p>
						<br />
						<div>
							{isWaiting && !props.gotError ? (
								<strong>
									<FormattedMessage id="providerAuth.waiting" defaultMessage={`Waiting for ${providerCapitalized} authentication`}/> <LoadingEllipsis />
								</strong>
							) : { ideAuthFailure } ? (
								<strong>
									<FormattedMessage id="providerAuth.accountNoFound" defaultMessage="Account not found. Please "/><Link onClick={onClickGoToSignup}><FormattedMessage id="providerAuth.signUp" defaultMessage="sign up"/></Link>.
								</strong>
							) : (
								<strong>
									{props.gotError ? <FormattedMessage id="providerAuth.failed" defaultMessage="Login failed"/> : <FormattedMessage id="providerAuth.timeOut" defaultMessage="Login timed out"/>}. <FormattedMessage id="providerAuth.please" defaultMessage="Please"/>{" "}
									<Link onClick={onClickTryAgain}><FormattedMessage id="providerAuth.tryAgain" defaultMessage="try again"/></Link>.
								</strong>
							)}
						</div>
					</div>
					<p>
						<FormattedMessage id="providerAuth.wrong" defaultMessage="Something went wrong? "/><Link href="mailto:support@codestream.com"><FormattedMessage id="providerAuth.contact" defaultMessage="Contact support"/></Link>{" "}
						<FormattedMessage id="providerAuth.or" defaultMessage="or "/><Link onClick={onClickTryAgain}><FormattedMessage id="providerAuth.tryAgain" defaultMessage="Try again"/></Link>
					</p>
					<Link onClick={onClickGoBack}>
						<p>
							<FormattedMessage id="providerAuth.back" defaultMessage={"< Back"}/>
						</p>
					</Link>
				</fieldset>
			</form>
		</div>
	);
});

function LoadingEllipsis() {
	const [dots, setDots] = useState(".");
	useInterval(() => {
		switch (dots) {
			case ".":
				return setDots("..");
			case "..":
				return setDots("...");
			case "...":
				return setDots(".");
		}
	}, 500);

	return <React.Fragment>{dots}</React.Fragment>;
}
