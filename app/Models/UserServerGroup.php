<?php

namespace Pterodactyl\Models;

use Illuminate\Support\Str;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property string $uuid
 * @property int $user_id
 * @property string $name
 * @property int $order
 * @property \Carbon\Carbon $created_at
 * @property \Carbon\Carbon $updated_at
 *
 * @property \Pterodactyl\Models\User $user
 * @property \Pterodactyl\Models\UserServerPreference[]|\Illuminate\Database\Eloquent\Collection $preferences
 */
class UserServerGroup extends Model
{
    /**
     * The resource name for this model.
     */
    public const RESOURCE_NAME = 'user_server_group';

    /**
     * The table associated with the model.
     */
    protected $table = 'user_server_groups';

    /**
     * Fields that can be mass assigned.
     */
    protected $fillable = [
        'user_id',
        'name',
        'order',
    ];

    public static array $validationRules = [
        'user_id' => 'required|numeric|exists:users,id',
        'name' => 'required|string|max:255',
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
     * Gets the user that owns the group.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Gets the preferences associated with this group.
     */
    public function preferences(): HasMany
    {
        return $this->hasMany(UserServerPreference::class, 'group_id');
    }
}
