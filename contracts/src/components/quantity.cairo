use eternum::alias::ID;

// not all entities are just a single object, some can be multiple.
// e.g. a group of free transport units can be a single entity with 
// a quantity component to show how many there are.
#[derive(Component, Copy, Drop, Serde, SerdeLen)]
struct Quantity {
    value: u128, 
}


// attach it to an entity + entity_type to count the quantity of an entity type
// a way to track how many of a certain entity type there are.
// e.g. for free transport units, we only allow realms to have a maximum of them
// at the same time. Thus if this component exists for a realm and free transport units
// we need to update it everytime a free transport unit is created of destroyed.
#[derive(Component, Copy, Drop, Serde, SerdeLen)]
struct QuantityTracker {
    count: u128, 
}

