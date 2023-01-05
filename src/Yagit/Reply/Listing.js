/*
| The servers replies to a clients listing request.
*/
'use strict';

def.attributes =
{
	// the listing
	listing: { type: 'Yagit/Listing/Self', json: true },
};

def.json = 'ReplyListing';
