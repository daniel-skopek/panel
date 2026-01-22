<?php

namespace Pterodactyl\Http\Controllers\Api\Client;

use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;
use Pterodactyl\Models\UserServerGroup;
use Pterodactyl\Models\UserServerPreference;
use Pterodactyl\Http\Requests\Api\Client\ClientApiRequest;
use Pterodactyl\Transformers\Api\Client\UserServerGroupTransformer;

class ServerGroupController extends ClientApiController
{
    /**
     * Returns all server groups for the authenticated user.
     */
    public function index(ClientApiRequest $request): array
    {
        return $this->fractal->collection($request->user()->serverGroups()->orderBy('order')->get())
            ->transformWith($this->getTransformer(UserServerGroupTransformer::class))
            ->toArray();
    }

    /**
     * Stores a new server group for the authenticated user.
     */
    public function store(ClientApiRequest $request): array
    {
        $this->validate($request, [
            'name' => 'required|string|max:255',
        ]);

        $maxOrder = $request->user()->serverGroups()->max('order') ?? 0;

        $model = $request->user()->serverGroups()->create([
            'name' => $request->input('name'),
            'order' => $maxOrder + 1,
        ]);

        return $this->fractal->item($model)
            ->transformWith($this->getTransformer(UserServerGroupTransformer::class))
            ->toArray();
    }

    /**
     * Updates a server group.
     */
    public function update(ClientApiRequest $request, int $group): array
    {
        $model = $request->user()->serverGroups()->findOrFail($group);

        $this->validate($request, [
            'name' => 'sometimes|required|string|max:255',
        ]);

        $model->update($request->only('name'));

        return $this->fractal->item($model)
            ->transformWith($this->getTransformer(UserServerGroupTransformer::class))
            ->toArray();
    }

    /**
     * Deletes a server group.
     */
    public function delete(ClientApiRequest $request, int $group): JsonResponse
    {
        $model = $request->user()->serverGroups()->findOrFail($group);
        $model->delete();

        return new JsonResponse([], JsonResponse::HTTP_NO_CONTENT);
    }

    /**
     * Reorders server groups.
     */
    public function reorder(ClientApiRequest $request): JsonResponse
    {
        $this->validate($request, [
            'groups' => 'required|array',
            'groups.*.id' => ['required', 'numeric', Rule::exists('user_server_groups', 'id')->where('user_id', $request->user()->id)],
            'groups.*.order' => 'required|numeric|min:0',
        ]);

        foreach ($request->input('groups') as $groupData) {
            $request->user()->serverGroups()
                ->where('id', $groupData['id'])
                ->update(['order' => $groupData['order']]);
        }

        return new JsonResponse([], JsonResponse::HTTP_NO_CONTENT);
    }

    /**
     * Updates server preferences.
     */
    public function updatePreferences(ClientApiRequest $request): JsonResponse
    {
        $this->validate($request, [
            'servers' => 'required|array',
            'servers.*.server_id' => 'required|numeric|exists:servers,id',
            'servers.*.group_id' => ['nullable', 'numeric', Rule::exists('user_server_groups', 'id')->where('user_id', $request->user()->id)],
            'servers.*.order' => 'required|numeric|min:0',
        ]);

        foreach ($request->input('servers') as $prefData) {
            $hasAccess = $request->user()->root_admin || $request->user()->accessibleServers()
                ->where('servers.id', $prefData['server_id'])
                ->exists();

            if (!$hasAccess) {
                continue;
            }

            UserServerPreference::updateOrCreate(
                [
                    'user_id' => $request->user()->id,
                    'server_id' => $prefData['server_id'],
                ],
                [
                    'group_id' => $prefData['group_id'],
                    'order' => $prefData['order'],
                ]
            );
        }

        return new JsonResponse([], JsonResponse::HTTP_NO_CONTENT);
    }
}
