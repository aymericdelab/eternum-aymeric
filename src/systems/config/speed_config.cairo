#[system]
mod SetSpeedConfig {
    use traits::Into;
    use eternum::components::config::SpeedConfig;
    use eternum::constants::WORLD_CONFIG_ID;

    fn execute(entity_type: u128, km_per_hr: u128) {
        commands::<SpeedConfig>::set_entity(
            (WORLD_CONFIG_ID, entity_type).into(), (SpeedConfig { entity_type, km_per_hr,  })
        );
    }
}