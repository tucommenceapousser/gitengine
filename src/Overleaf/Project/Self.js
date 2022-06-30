/*
| The data about an overleaf project.
*/
'use strict';

def.attributes =
{
	// the overleaf id
	id: { type: [ 'string' ], },

	// timestamp of last down sync
	downSyncTimestamp: { type: [ 'undefined', 'number' ] },

	// the semaphore for this project
	semaphore: { type: [ 'Util/Semaphore' ], },
};
