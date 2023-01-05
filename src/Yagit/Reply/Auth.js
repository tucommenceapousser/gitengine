/*
| The servers replies to a succesfull clients auth request.
*/
'use strict';

def.attributes =
{
	// the username the session belongs to.
	username: { type: 'string', json: true },
};

def.json = 'ReplyAuth';
