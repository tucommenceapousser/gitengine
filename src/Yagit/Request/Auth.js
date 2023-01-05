/*
| The client requests a session to be checked/authenticated.
*/
'use strict';

def.attributes =
{
	// the session
	session: { type: 'string', json: true },
};

def.json = 'RequestAuth';
