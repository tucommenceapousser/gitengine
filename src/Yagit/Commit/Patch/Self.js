/*
| A git patch (part of commit)
*/
'use strict';

def.attributes =
{
	// new filename
	// different to oldFile in case of move.
	// undefined in case of remove
	newFile: { type: [ 'undefined', 'string' ], json: true },

	// old filename
	// undefined in case of added
	oldFile: { type: [ 'undefined', 'string' ], json: true },

	// hunks (a.k.a. parts) of the patch.
	hunks: { type: 'Yagit/Commit/Patch/Hunk/List', json: true },
};

def.json = 'CommitPatch';
