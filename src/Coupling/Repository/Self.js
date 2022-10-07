/*
| The data about a remote coupled repository.
*/
'use strict';

def.attributes =
{
	// the repository remote url
	url: { type: [ 'string' ], },

	// timestamp of last down sync
	downSyncTimestamp: { type: [ 'undefined', 'number' ] },

	// the semaphore for this remote repository
	semaphore: { type: [ 'Util/Semaphore' ], },
};
