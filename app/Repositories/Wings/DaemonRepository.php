<?php

namespace Pterodactyl\Repositories\Wings;

use GuzzleHttp\Client;
use GuzzleHttp\HandlerStack;
use Pterodactyl\Models\Node;
use Webmozart\Assert\Assert;
use GuzzleHttp\Promise\Create;
use Pterodactyl\Models\Server;
use Illuminate\Support\Facades\Cache;
use Psr\Http\Message\RequestInterface;
use GuzzleHttp\Exception\ConnectException;
use Illuminate\Contracts\Foundation\Application;

abstract class DaemonRepository
{
    protected ?Server $server;

    protected ?Node $node;

    /**
     * DaemonRepository constructor.
     */
    public function __construct(protected Application $app)
    {
    }

    /**
     * Set the server model this request is stemming from.
     */
    public function setServer(Server $server): self
    {
        $this->server = $server;

        $this->setNode($this->server->node);

        return $this;
    }

    /**
     * Set the node model this request is stemming from.
     */
    public function setNode(Node $node): self
    {
        $this->node = $node;

        return $this;
    }

    /**
     * Return an instance of the Guzzle HTTP Client to be used for requests.
     */
    public function getHttpClient(array $headers = []): Client
    {
        Assert::isInstanceOf($this->node, Node::class);

        $nodeId = $this->node->id;
        $key = 'node_down:' . $nodeId;

        $stack = HandlerStack::create();
        $stack->push(function (callable $handler) use ($key, $nodeId) {
            return function (RequestInterface $request, array $options) use ($handler, $key, $nodeId) {
                if (config('cache.default') !== 'array' && Cache::has($key)) {
                    return Create::rejectionFor(new ConnectException(
                        "Node $nodeId is currently marked as down in the cache.",
                        $request
                    ));
                }

                return $handler($request, $options);
            };
        });

        $stack->push(function (callable $handler) use ($key) {
            return function (RequestInterface $request, array $options) use ($handler, $key) {
                return $handler($request, $options)->otherwise(function ($reason) use ($key) {
                    if ($reason instanceof ConnectException) {
                        Cache::put($key, true, now()->addSeconds(30));
                    }

                    return Create::rejectionFor($reason);
                });
            };
        });

        return new Client([
            'handler' => $stack,
            'verify' => $this->app->environment('production'),
            'base_uri' => $this->node->getConnectionAddress(),
            'timeout' => config('pterodactyl.guzzle.timeout'),
            'connect_timeout' => config('pterodactyl.guzzle.connect_timeout'),
            'headers' => array_merge($headers, [
                'Authorization' => 'Bearer ' . $this->node->getDecryptedKey(),
                'Accept' => 'application/json',
                'Content-Type' => 'application/json',
            ]),
        ]);
    }
}
