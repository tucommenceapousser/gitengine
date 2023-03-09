/*
| Manages the users.
*/
'use strict';

def.abstract = true;

let _users;

const CGit = ti2c.require( 'Https/CGit' );
const User = ti2c.require( 'User/Self' );
const UserGroup = ti2c.require( 'User/Group' );

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
/**/if( CHECK && user.timtype !== User ) throw new Error( );

	_users = _users.set( user.username, user );
	CGit.invalidate( user.username );
};

/*
| Returns the users.
*/
def.static.users = ( ) => _users;
