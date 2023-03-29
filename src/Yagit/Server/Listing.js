/*
| Handles the listing request.
|
| Provides info about all the repositories available to an user.
*/
'use strict';

def.abstract = true;

import { Self as Access } from '{Yagit/Server/Access}';
import { Self as Https } from '{Https/Self}';
import { Self as Listing } from '{Yagit/Listing/Self}';
import { Self as ListingRepository } from '{Yagit/Listing/Repository}';
import { Self as ReplyListing } from '{Yagit/Reply/Listing}';
import { Self as RepositoryManager } from '{Repository/Manager}';

/*
| Handles a file request.
*/
def.static.handle =
	async function( request, result, path )
{
	const parts = path.parts;

	const plen = parts.length;
	if( plen !== 1 )
	{
		return Https.error( result, 404, 'invalid request length' );
	}

/**/if( CHECK && parts.get( 0 ) !== 'listing' ) throw new Error( );

	const user = Access.test( request, result );
	if( !user ) return;

	const repositories = RepositoryManager.repositories( );

	// FIXME caching
	const group = { };
	for( let repo of repositories )
	{
		if( !repo.getPermissions( user ) ) continue;

		group[ repo.name ] =
			ListingRepository.create(
				'description', repo.description,
				'name', repo.name,
			);
	}
	const listing = Listing.Table( group );
	const reply = ReplyListing.create( 'listing', listing );
	result.writeHead( 200, { } );
	result.end( reply.jsonfy( ) );
};
