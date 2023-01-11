/*
| The client requests an user login.
*/
'use strict';

def.attributes =
{
	// the username
	username: { type: 'string', json: true },

	// the password
	password: { type: 'string', json: true },
};

def.json = 'RequestLogin';
