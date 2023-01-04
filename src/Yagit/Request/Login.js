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

	// boolean if remember flag is set
	// the session time will depend on that
	remember: { type: 'boolean', json: true }
};

def.json = 'RequestLogin';
