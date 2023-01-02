/*
| The server replies a directory.
*/
'use strict';

def.attributes =
{
	// commit list
	commits: { type: 'Yagit/Commit/List', json: true },

	// offset of the list
	offset: { type: 'number', json: true },

	// repository name
	repository: { type: 'string', json: true },

	// total commits in repository
	total: { type: 'number', json: true },
};

def.json = 'ReplyHistory';
