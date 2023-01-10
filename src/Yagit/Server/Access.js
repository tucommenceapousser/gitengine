/*
| Handles access tests.
*/
'use strict';

def.abstract = true;

const Https = tim.require( 'Https/Self' );
const RepositoryManager = tim.require( 'Repository/Manager' );
const SessionManager = tim.require( 'Yagit/Session/Manager' );
const UserManager = tim.require( 'User/Manager' );

/*
| Handles the access request.
*/
def.static.test =
	function( request, result, repoName )
{
	const xSession = request.headers[ 'x-session' ];
	if( !xSession )
	{
		return Https.error( result, 401, 'x-session missing in header' );
	}

	const session = SessionManager.getSession( xSession );
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
