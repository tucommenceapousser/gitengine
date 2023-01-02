/*
| A commit patch hunk.
*/
'use strict';

def.attributes =
{
	// lines of the hunk
	lines: { type: 'Yagit/Commit/Patch/Hunk/Line/List', json: true }
};

def.json = 'CommitPatchHunk';
