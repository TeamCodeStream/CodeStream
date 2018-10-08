import _ from "underscore";

const initialState = {
	byTeam: {
		//[teamId]: { [streamId]: {} }
	},
	byRepo: {
		//[repoId]: { byFile: {} }
	}
};

const addStreamForTeam = (state, stream) => {
	const teamId = stream.teamId;
	const teamStreams = state[teamId] || {};
	return {
		...state,
		[teamId]: { ...teamStreams, [stream.id]: stream }
	};
};

const addStream = (state, stream) => {
	const existingStreamsForRepo = state.byRepo[stream.repoId] || { byFile: {}, byId: {} };
	return {
		byTeam: addStreamForTeam(state.byTeam, stream),
		byRepo: {
			...state.byRepo,
			[stream.repoId]: {
				byFile: {
					...existingStreamsForRepo.byFile,
					[stream.file]: stream
				},
				byId: {
					...existingStreamsForRepo.byId,
					[stream.id]: stream
				}
			}
		}
	};
};

export default (state = initialState, { type, payload }) => {
	switch (type) {
		case "ADD_STREAMS":
		case "BOOTSTRAP_STREAMS":
			return payload.reduce(addStream, state);
		case "STREAMS-UPDATE_FROM_PUBNUB":
		case "UPDATE_STREAM":
		case "ADD_STREAM":
			return addStream(state, payload);
		case "REMOVE_STREAM": {
			const streamsForTeam = state.byTeam[payload.teamId] || {};
			delete streamsForTeam[payload.streamId];
			return {
				...state,
				byTeam: { ...state.byTeam, [payload.teamId]: streamsForTeam }
			};
		}
		default:
			return state;
	}
};

// Selectors
export const getStreamForTeam = (state, teamId) => {
	const streams = state.byTeam[teamId] || {};
	return _.sortBy(Object.values(streams).filter(stream => stream.isTeamStream), "createdAt")[0];
};

export const getChannelStreamsForTeam = (state, teamId, userId) => {
	const streams = state.byTeam[teamId] || {};
	return Object.values(streams).filter(
		stream =>
			stream.type === "channel" &&
			!stream.deactivated &&
			!stream.isArchived &&
			!stream.serviceType &&
			(stream.isTeamStream || _.contains(stream.memberIds, userId))
	);
};

export const getPublicChannelStreamsForTeam = (state, teamId, userId) => {
	const streams = state.byTeam[teamId] || {};
	return Object.values(streams).filter(
		stream =>
			stream.type === "channel" &&
			!stream.deactivated &&
			!stream.isArchived &&
			!stream.isTeamStream &&
			!stream.serviceType &&
			!_.contains(stream.memberIds, userId)
	);
};

export const getArchivedChannelStreamsForTeam = (state, teamId, userId) => {
	const streams = state.byTeam[teamId] || {};
	return Object.values(streams).filter(stream => stream.type === "channel" && stream.isArchived);
};

const makeName = user => {
	if (!user) return;
	if (user.username) {
		return user.username;
	} else {
		return user.email.replace(/@.*/, "");
	}
};

const makeDirectMessageStreamName = (memberIds, users) => {
	const names = memberIds.map(id => makeName(users[id])).filter(Boolean);
	if (names.length === 0) {
		console.warn("Cannot create direct message stream name without member names", {
			memberIds,
			users
		});
		return "NO NAME";
	}
	return names.join(", ");
};

export const getDMName = (stream, users, currentUserId) => {
	if (stream.name) return stream.name;
	if (stream.type === "direct") {
		// if it's a direct message w/myself, then use my name, otherwise exclude myself
		if (false && stream.memberIds.length === 1 && stream.memberIds[0] === currentUserId) {
			return makeDirectMessageStreamName([currentUserId], users) + " (you)";
		}
		const withoutMe = (stream.memberIds || []).filter(id => id !== currentUserId);
		return makeDirectMessageStreamName(withoutMe, users);
	} else {
		console.warn("Cannot get a name for a non-dm channel", stream);
		return "NO NAME";
	}
};

export const getDirectMessageStreamsForTeam = (state, teamId) => {
	const streams = state.byTeam[teamId] || {};
	// TODO: filter for only those including the current user
	return Object.values(streams).filter(stream => stream.type === "direct");
};

export const getServiceStreamsForTeam = (state, teamId, userId) => {
	const streams = state.byTeam[teamId] || {};
	const serviceStreams = Object.values(streams).filter(
		stream =>
			stream.type === "channel" &&
			!stream.deactivated &&
			!stream.isArchived &&
			stream.serviceType &&
			(stream.isTeamStream || _.contains(stream.memberIds, userId))
	);
	serviceStreams.map(stream => {
		stream.displayName = "Live Share";
	});
	return serviceStreams;
};

export const getStreamForId = (state, teamId, streamId) => {
	const streams = state.byTeam[teamId] || {};
	return Object.values(streams).find(stream => stream.id === streamId);
};

export const getStreamForRepoAndFile = (state, repoId, file) => {
	const filesForRepo = (state.byRepo[repoId] || {}).byFile;
	if (filesForRepo) return filesForRepo[file];
};

export const getStreamsByFileForRepo = (state, repoId) => {
	return (state.byRepo[repoId] || {}).byFile;
};

export const getStreamsByIdForRepo = (state, repoId) => {
	return (state.byRepo[repoId] || {}).byId;
};

// If stream for a pending post is created, the pending post will be lost (not displayed)
// TODO: reconcile pending posts for a file with stream when the stream is created
export const getPostsForStream = ({ byStream, pending }, streamId = "") => {
	if (streamId === "") return [];
	const pendingForStream = pending.filter(it => {
		try {
			return it.streamId === streamId || it.stream.file === streamId;
		} catch (e) {
			return false;
		}
	});
	return [..._.sortBy(byStream[streamId], "seqNum"), ...pendingForStream];
};

export const getAllPostsOfType = ({ byStream }, type) => {
	let posts = [];
	Object.keys(byStream).forEach(streamId => {
		posts = posts.concat(Object.values(byStream[streamId]));
	});
	return [..._.sortBy(posts, "seqNum")];
};
