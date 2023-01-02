/*
| A git diffs (= a list of patches)
*/
'use strict';

def.attributes =
{
	patches: { type: 'Yagit/Commit/Patch/List', json: true },
};

def.json = 'CommitDiffs';
