/*
| A line in a commit patch hunk.
*/
'use strict';

def.attributes =
{
	// origin?

	// old line number
	oldLineno: { type: 'number', json: true },

	// new line number
	newLineno: { type: 'number', json: true },

	// numLines=

	//contentLen?
	//contentOffset?

	// content
	content: { type: 'string', json: true },
};

def.json = 'CommitPatchHunkLine';
