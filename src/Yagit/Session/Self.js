/*
| A session handle.
*/
'use strict';

def.attributes =
{
	// the username belonging the session
	username: { type: 'string', json: true },

	// timestamp of session creation
	created: { type: 'integer', json: true },
};

def.json = 'Session';
