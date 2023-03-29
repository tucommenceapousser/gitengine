/*
| An access token for a user.
*/
'use strict';

def.attributes =
{
	// the token
	token: { type: 'string' },

	// expires on milliseconds since 1970 epoch.
	expires: { type: 'number', json: true, },
};

import crypto from 'crypto';

/*
| One hour life time.
*/
def.static.lifetime = 60 * 60 * 1000;

/*
| True if expired.
*/
def.proto.expired =
	function( )
{
	return Date.now( ) > this.expires;
};

/*
| Returns a refreshed token.
*/
def.proto.refresh =
	function( )
{
	return this.create( 'expires', Date.now( ) + Self.lifetime );
};

/*
| Generates a new token.
*/
def.static.Generate =
	function( )
{
	return(
		Self.create(
			'token', crypto.randomUUID( ),
			'expires', Date.now( ) + Self.lifetime,
		)
	);
};
