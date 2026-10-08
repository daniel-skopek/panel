<?php

namespace Pterodactyl\Http\Controllers\Api\Client\Servers;

use Carbon\Carbon;
use Pterodactyl\Models\Server;
use Illuminate\Cache\Repository;
use Pterodactyl\Transformers\Api\Client\StatsTransformer;
use Pterodactyl\Repositories\Wings\DaemonServerRepository;
use Pterodactyl\Http\Controllers\Api\Client\ClientApiController;
use Pterodactyl\Http\Requests\Api\Client\Servers\GetServerRequest;
use Pterodactyl\Exceptions\Http\Connection\DaemonConnectionException;

class ResourceUtilizationController extends ClientApiController
{
    /**
     * ResourceUtilizationController constructor.
     */
    public function __construct(private Repository $cache, private DaemonServerRepository $repository)
    {
        parent::__construct();
    }

    /**
     * Return the current resource utilization for a server. This value is cached for up to
     * 20 seconds at a time to ensure that repeated requests to this endpoint do not cause
     * a flood of unnecessary API calls. If the node cannot be reached the server is reported
     * as offline rather than failing the request with a gateway timeout.
     */
    public function __invoke(GetServerRequest $request, Server $server): array
    {
        $key = "resources:$server->uuid";
        $stats = $this->cache->remember($key, Carbon::now()->addSeconds(20), function () use ($server) {
            try {
                return $this->repository->setServer($server)->getDetails();
            } catch (DaemonConnectionException) {
                // If the node is unreachable we still want to return a valid response to the
                // client rather than a 504. Returning any error here would cause the front-end
                // to keep retrying and, more importantly, Cloudflare to consider the Panel down.
                return [
                    'state' => 'offline',
                    'is_suspended' => $server->isSuspended(),
                    'utilization' => [
                        'memory_bytes' => 0,
                        'cpu_absolute' => 0,
                        'disk_bytes' => 0,
                        'network' => [
                            'rx_bytes' => 0,
                            'tx_bytes' => 0,
                        ],
                        'uptime' => 0,
                    ],
                ];
            }
        });

        return $this->fractal->item($stats)
            ->transformWith($this->getTransformer(StatsTransformer::class))
            ->toArray();
    }
}
