/*
| The servers replies to a succesfull clients login request.
*/
'use strict';

def.attributes =
{
	// the session key that has been created
	session: { type: 'string', json: true },
};

def.json = 'ReplyLogin';
