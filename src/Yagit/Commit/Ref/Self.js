/*
| A reference to a commit.
*/
'use strict';

def.attributes =
{
	// offset in the current list.
	offset: { type: [ 'undefined', 'number' ], json: true },

	// level in tree graph
	graphLevel: { type: [ 'undefined', 'number' ], json: true },

	// sha of commit
	sha: { type: 'string', json: true },
};

def.json = 'CommitRef';
