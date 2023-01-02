/*
| Branches info of a repository.
*/
'use strict';

def.attributes =
{
	// names keys, values are shas
	branches: { type: 'tim:string/group', json: true }
};

def.json = 'ReplyBranches';
