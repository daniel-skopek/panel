<?php

namespace Pterodactyl\Transformers\Api\Client;

use Pterodactyl\Models\UserServerGroup;

class UserServerGroupTransformer extends BaseClientTransformer
{
    public function getResourceName(): string
    {
        return UserServerGroup::RESOURCE_NAME;
    }

    public function transform(UserServerGroup $model): array
    {
        return [
            'id' => $model->id,
            'uuid' => $model->uuid,
            'name' => $model->name,
            'order' => $model->order,
            'created_at' => $model->created_at->toIso8601String(),
            'updated_at' => $model->updated_at->toIso8601String(),
        ];
    }
}
