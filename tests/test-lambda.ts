import { test, expect } from '@jest/globals';

import { handler } from '../src/lambda-handler';

import animatedGifLambdaEvent from './events/animated-gif.json';
import acceptWebpLambdaEvent from './events/accept-webp.json';
import acceptWebpCustomHeaderLambdaEvent from './events/accept-webp-custom.json';
import notAcceptWebpLambdaEvent from './events/not-accept-webp.json';

process.env.S3_REGION = 'us-east-1';
process.env.S3_BUCKET = 'hmn-uploads';

test( 'Test content type headers', async () => {
	const testResponseStream = new TestResponseStream();
	await handler( animatedGifLambdaEvent, testResponseStream );

	expect( testResponseStream.contentType ).toBe( 'image/gif' );
} );

test( 'Test image not found', async () => {
	const testResponseStream = new TestResponseStream();
	animatedGifLambdaEvent.rawPath = '/tachyon/does-not-exist.gif';

	await handler( animatedGifLambdaEvent, testResponseStream );

	expect( testResponseStream.metadata.statusCode ).toBe( 404 );
	expect( testResponseStream.contentType ).toBe( 'text/html' );
} );

test( 'Test convert to webp with accept:image/webp header', async () => {
	const testResponseStream = new TestResponseStream();
	await handler( acceptWebpLambdaEvent, testResponseStream );

	expect( testResponseStream.contentType ).toBe( 'image/webp' );
} );

test( 'Test convert to webp with x-webp header', async () => {
	const testResponseStream = new TestResponseStream();
	await handler( acceptWebpCustomHeaderLambdaEvent, testResponseStream );

	expect( testResponseStream.contentType ).toBe( 'image/webp' );
} );

test( 'Test do not convert to webp', async () => {
	const testResponseStream = new TestResponseStream();
	await handler( notAcceptWebpLambdaEvent, testResponseStream );

	expect( testResponseStream.contentType ).toBe( 'image/jpeg' );
} );

/**
 * A test response stream.
 */
class TestResponseStream {
	contentType: string | undefined;
	body: string | Buffer | undefined;
	headers: { [key: string]: string } = {};
	metadata: any;

	setContentType( type: string ): void {
		this.contentType = type;
	}
	write( stream: string | Buffer ): void {
		if ( typeof this.body === 'string' ) {
			this.body += stream;
		} else if ( this.body instanceof Buffer ) {
			this.body = this.body.toString().concat( stream.toString() );
		} else {
			this.body = stream;
		}
	}
	end(): void {
		if ( this.metadata.headers['Content-Type'] ) {
			this.contentType = this.metadata.headers['Content-Type'];
		}
	}
}

global.awslambda = {
	/**
	 *
	 * @param handler
	 */
	streamifyResponse( handler: StreamifyHandler ): StreamifyHandler {
		return handler;
	},
	HttpResponseStream: {
		/**
		 * @param stream The response stream.
		 * @param metadata The metadata for the response.
		 */
		from( stream: TestResponseStream, metadata ) : TestResponseStream {
			stream.metadata = metadata;
			return stream;
		},
	},
};
