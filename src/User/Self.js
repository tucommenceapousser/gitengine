/*
| A user.
*/
'use strict';

def.attributes =
{
	// groups the user is member of
	groups: { type: 'tim:string/set' },

	// passhashes
	passhash: { type: 'passlock:PassHash/Overlay' },

	// ssh key list
	sshKeys: { type: 'passlock:SshKey/List' },

	// the username of the person
	// not in json, identical to key in PersonGroup
	username: { type: 'string' },
};
