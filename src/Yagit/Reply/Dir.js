/*
| The server replies a /dir request.
*/
'use strict';

def.attributes =
{
	// the entries in the dir
	entries: { type: 'Yagit/Dir/Entry/List', json: true }
};

def.json = 'ReplyDir';
