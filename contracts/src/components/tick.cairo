// TODO next milestone
use eternum::components::config::WorldConfig;
use eternum::utils::math::get_past_time;

#[derive(Component, Copy, Drop, Serde, SerdeLen)]
struct Tick {
    last_update: u128
}
trait TickTrait {
    fn needs_update(self: Tick, world_config: WorldConfig, block_timestamp: u128) -> bool;
}

impl TickImpl of TickTrait {
    fn needs_update(self: Tick, world_config: WorldConfig, block_timestamp: u128) -> bool {
        get_past_time(self.last_update + world_config.tick_time, block_timestamp)
    }
}

