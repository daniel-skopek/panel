<?php

namespace Pterodactyl\Tests\Unit\Extensions\Guzzle;

use GuzzleHttp\Psr7\Request;
use GuzzleHttp\Psr7\Response;
use GuzzleHttp\Promise\Create;
use Pterodactyl\Tests\TestCase;
use Illuminate\Cache\ArrayStore;
use Illuminate\Cache\Repository;
use GuzzleHttp\Exception\ConnectException;
use Pterodactyl\Extensions\Guzzle\CircuitBreakerMiddleware;

class CircuitBreakerMiddlewareTest extends TestCase
{
    public function testSuccessfulRequestsDoNotMarkNodeUnavailable()
    {
        $cache = new Repository(new ArrayStore());
        $handler = (new CircuitBreakerMiddleware($cache, 1, 30))(
            fn () => Create::promiseFor(new Response(200))
        );

        $response = $handler(new Request('GET', '/'), [])->wait();

        $this->assertSame(200, $response->getStatusCode());
        $this->assertFalse($cache->has('nodes:unavailable:1'));
    }

    public function testConnectionFailuresMarkNodeUnavailable()
    {
        $cache = new Repository(new ArrayStore());
        $handler = (new CircuitBreakerMiddleware($cache, 1, 30))(
            fn (Request $request) => Create::rejectionFor(new ConnectException('Connection refused', $request))
        );

        $this->expectException(ConnectException::class);

        try {
            $handler(new Request('GET', '/'), [])->wait();
        } finally {
            $this->assertTrue($cache->has('nodes:unavailable:1'));
        }
    }

    public function testRequestsAreRejectedImmediatelyWhileNodeIsUnavailable()
    {
        $cache = new Repository(new ArrayStore());
        $cache->put('nodes:unavailable:1', true, 30);

        $called = false;
        $handler = (new CircuitBreakerMiddleware($cache, 1, 30))(
            function () use (&$called) {
                $called = true;

                return Create::promiseFor(new Response(200));
            }
        );

        $this->expectException(ConnectException::class);

        try {
            $handler(new Request('GET', '/'), [])->wait();
        } finally {
            $this->assertFalse($called);
        }
    }
}
