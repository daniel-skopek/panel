<?php

namespace Pterodactyl\Extensions\Guzzle;

use GuzzleHttp\Promise\Create;
use Psr\Http\Message\RequestInterface;
use GuzzleHttp\Exception\ConnectException;
use Illuminate\Contracts\Cache\Repository;

/**
 * Prevents the Panel from repeatedly waiting on a node that is unreachable or
 * responding too slowly. Once a connection to a node fails (which also covers
 * request timeouts) the node is marked as unavailable in the cache for a short
 * period so subsequent requests fail immediately instead of blocking a PHP
 * worker for the full timeout.
 */
class CircuitBreakerMiddleware
{
    public function __construct(
        private Repository $cache,
        private int $nodeId,
        private int $ttl,
    ) {
    }

    public function __invoke(callable $handler): callable
    {
        return function (RequestInterface $request, array $options) use ($handler) {
            $key = $this->getCacheKey();

            if ($this->cache->has($key)) {
                return Create::rejectionFor(new ConnectException(
                    sprintf('Node %d is currently marked as unavailable.', $this->nodeId),
                    $request
                ));
            }

            return $handler($request, $options)->otherwise(function ($reason) use ($key) {
                if ($reason instanceof ConnectException) {
                    $this->cache->put($key, true, $this->ttl);
                }

                return Create::rejectionFor($reason);
            });
        };
    }

    private function getCacheKey(): string
    {
        return sprintf('nodes:unavailable:%d', $this->nodeId);
    }
}
