'use strict';

module.exports =
	require( '@timberdoodle/tim' )
	.register( 'gitengine', module, 'src/', 'root.js' )
	.require( 'Self.js' );
