/*
| A logger.
*/

def.abstract = true;

const log = console.log;

/*
| True for debugging.
| TODO.
*/
def.static.debugging = false;
//def.static.debugging = true;

/*
| Client counter.
*/
let count = 1;

/*
| Months for logging.
*/
const months =
	Object.freeze( [
		'Jan', 'Feb', 'Mar',
		'Apr', 'May', 'Jun',
		'Jul', 'Aug', 'Sep',
		'Oct', 'Nov', 'Dec',
	] );

/*
| Logs only if debugging is turned on.
*/
def.static.debug =
	function( facility, ...args )
{
	if( Self.debugging )
	{
		const date = new Date( );
		const month = months[ date.getMonth( ) ];
		let day = date.getDate( );
		day = day < 10 ? ' ' + day : '' + day;
		let hour = date.getHours( );
		hour = hour < 10 ? '0' + hour : '' + hour;
		let min = date.getMinutes( );
		min = min < 10 ? '0' + min : '' + min;
		let sec = date.getSeconds( );
		sec = sec < 10 ? '0' + sec : '' + sec;
		const timestamp = month + ' ' + day + ' ' + hour + ':' + min + ':' + sec;

		args.unshift( timestamp, facility + '[' + count + ']:' );
		log.apply( log, args );
	}
};

/*
| General logging routine.
|
| ~facility: logging facility (category).
| ~count: client counter, or '*'.
*/
def.static.log =
	function( facility, count, ...args )
{
	const date = new Date( );
	const month = months[ date.getMonth( ) ];
	let day = date.getDate( );
	day = day < 10 ? ' ' + day : '' + day;
	let hour = date.getHours( );
	hour = hour < 10 ? '0' + hour : '' + hour;
	let min = date.getMinutes( );
	min = min < 10 ? '0' + min : '' + min;
	let sec = date.getSeconds( );
	sec = sec < 10 ? '0' + sec : '' + sec;
	const timestamp = month + ' ' + day + ' ' + hour + ':' + min + ':' + sec;

	args.unshift( timestamp, facility + '[' + count + ']:' );
	log.apply( log, args );
};

/*
| Return a client counter.
*/
def.static.getCount = function( ) { return count++; };
