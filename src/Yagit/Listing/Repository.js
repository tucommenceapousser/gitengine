/*
| A repository in the listing.
*/
'use strict';

def.attributes =
{
	// the repository description
	description: { type: [ 'undefined', 'string' ], json: true },

	// repository name
	name: { type: 'string', json: true },
};

def.json = 'ListingRepository';
