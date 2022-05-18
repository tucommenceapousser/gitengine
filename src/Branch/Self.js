/*
| The data about a git branch.
*/
'use strict';

def.attributes =
{
	// branch name
	name: { type: 'string' },

	// last commit hash
	lastCommitHash: { type: [ 'undefined', 'string' ] },
};
