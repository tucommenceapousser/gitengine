/*
| Semaphore.
*/
'use strict';

//  This is to stop interning.
def.attributes =
{
	_dummy : { type : 'protean', defaultValue : '{ }' }
};

/*
| Requests the semaphore.
|
| If the semaphore is in use, this functions waits
| until the semaphore is available.
|
| Returns a flag to be used in release.
*/
def.proto.request =
	function( )
{
	const _flag = this._.flag;
	const _fifo = this._.fifo;
	return(
		new Promise( ( resolve, reject ) => {
			// the semaphore is used?
			if( _flag.flag ) _fifo.push( resolve );
			// or free?
			else resolve( _flag.flag = Object.freeze( { } ) );
		} )
	);
};

/*
| Releases the semaphore.
|*/
def.proto.release =
	function( flag )
{
	const _flag = this._.flag;
	const _fifo = this._.fifo;
	// checks if something tries a wrong release
	if( flag !== _flag.flag ) throw new Error( );
	_flag.flag = undefined;
	// the semaphore comes free?
	if( _fifo.length === 0 ) return;
	const resolve = _fifo.shift( );
	resolve( _flag.flag = Object.freeze( { } ) );
};


/*
| Internal mutable storage.
*/
def.lazy._= ( ) => new Object( { flag : { }, fifo : [ ] } );
