/*
| Manages the users.
*/
'use strict';

def.abstract = true;

let _users;

import { Self as CGit } from '{Https/CGit}';
import { Self as User } from '{User/Self}';
import { Self as UserGroup } from '{User/Group}';

/*
| Initalizes the group manager.
*/
def.static.init = function( ) { _users = UserGroup.Empty; };

/*
| Gets a user.
*/
def.static.get = ( username ) => _users.get( username );

/*
| Removes a user.
*/
def.static.remove =
	function( username )
{
	_users = _users.remove( username );
	CGit.invalidate( username );
};

/*
| Sets a user.
*/
def.static.set =
	function( user )
{
/**/if( CHECK && user.ti2ctype !== User ) throw new Error( );

	_users = _users.set( user.username, user );
	CGit.invalidate( user.username );
};

/*
| Returns the users.
*/
def.static.users = ( ) => _users;
