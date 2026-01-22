<?php

namespace Pterodactyl\Models;

use Illuminate\Support\Str;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property string $uuid
 * @property int $user_id
 * @property int $server_id
 * @property int|null $group_id
 * @property int $order
 * @property \Carbon\Carbon $created_at
 * @property \Carbon\Carbon $updated_at
 *
 * @property \Pterodactyl\Models\User $user
 * @property \Pterodactyl\Models\Server $server
 * @property \Pterodactyl\Models\UserServerGroup|null $group
 */
class UserServerPreference extends Model
{
    /**
     * The resource name for this model.
     */
    public const RESOURCE_NAME = 'user_server_preference';

    /**
     * The table associated with the model.
     */
    protected $table = 'user_server_preferences';

    /**
     * Fields that can be mass assigned.
     */
    protected $fillable = [
        'user_id',
        'server_id',
        'group_id',
        'order',
    ];

    public static array $validationRules = [
        'user_id' => 'required|numeric|exists:users,id',
        'server_id' => 'required|numeric|exists:servers,id',
        'group_id' => 'nullable|numeric|exists:user_server_groups,id',
        'order' => 'required|numeric|min:0',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function (self $model) {
            $model->uuid = Str::uuid()->toString();
        });
    }

    /**
     * Gets the user that owns the preference.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Gets the server associated with the preference.
     */
    public function server(): BelongsTo
    {
        return $this->belongsTo(Server::class);
    }

    /**
     * Gets the group associated with the preference.
     */
    public function group(): BelongsTo
    {
        return $this->belongsTo(UserServerGroup::class, 'group_id');
    }
}
