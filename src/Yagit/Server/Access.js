/*
| Handles access tests.
*/
'use strict';

def.abstract = true;

const Cookie = ti2c.require( 'Yagit/Server/Cookie' );
const Https = ti2c.require( 'Https/Self' );
const RepositoryManager = ti2c.require( 'Repository/Manager' );
const SessionManager = ti2c.require( 'Yagit/Session/Manager' );
const UserManager = ti2c.require( 'User/Manager' );

/*
| Handles the access request.
*/
def.static.test =
	function( request, result, repoName )
{
	// for testing only!
	// return UserManager.get( 'axel' );

	let session = Cookie.handle( request );
	if( !session )
	{
		return Https.error( result, 401, 'invalid session' );
	}

	session = SessionManager.getSession( session );
	if( !session )
	{
		return Https.error( result, 401, 'invalid session' );
	}

	const user = UserManager.get( session.username );
	if( !user )
	{
		return Https.error( result, 401, 'invalid session' );
	}

	if( repoName )
	{
		const repo = RepositoryManager.get( repoName );
		if( !repo )
		{
			return Https.error( result, 401, 'no access' );
		}

		const permissions = repo.getPermissions( user );
		if( !permissions )
		{
			return Https.error( result, 401, 'no access' );
		}
	}

	// it's OK
	return user;
};
