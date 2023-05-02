// TODO: proper safe_transfer_from
//       token URI - wat do?
//       use low level API for execute
//       check for EIP compliance
//       auth?
//       pass in the token: felt252 as the first param to system::execute, since there can be more than 1 in a game; same as erc20
//       try ((get_contract_address(), token_id).into()) - without using into() on get_contract_address
//       maybe some nice / smart way how to use the get_contract_address automatically to build a query? so I don't have to inject it everywhere

// NOTES:
//   * owner_of is less optimal because it calls `owner` twice (once in `validate_token_id`) but
//     the code is cleaner this way so I kept it
//   * not sure yet where the auth asserts should be - in the 721 interface or in systems?

use starknet::StorageAccess;
use starknet::StorageBaseAddress;
use starknet::SyscallResult;
use starknet::storage_read_syscall;
use starknet::storage_write_syscall;
use starknet::storage_address_from_base_and_offset;
use traits::Into;
use traits::TryInto;
use option::OptionTrait;

use eternum::alias::ID;

#[derive(Drop, Serde)]
struct Position {
    x: u32,
    y: u32,
}

#[derive(Drop, Serde)]
struct RealmData {
    realm_id: ID, // OG Realm Id
    // packed resource ids of realm
    resource_ids_packed_low: u128, // u256
    resource_ids_packed_high: u128, // u256
    resource_ids_count: usize,
    cities: u8,
    harbors: u8,
    rivers: u8,
    regions: u8,
    wonder: u8,
    order: u8,
}

impl Pos2DStorageAccess of StorageAccess<Position> {
    fn read(address_domain: u32, base: StorageBaseAddress) -> SyscallResult::<Position> {
        Result::Ok(
            Position {
                x: storage_read_syscall(
                    address_domain, storage_address_from_base_and_offset(base, 0_u8)
                )?.try_into().unwrap(),
                y: storage_read_syscall(
                    address_domain, storage_address_from_base_and_offset(base, 1_u8)
                )?.try_into().unwrap(),
            }
        )
    }

    fn write(
        address_domain: u32, base: StorageBaseAddress, value: Position
    ) -> SyscallResult::<()> {
        storage_write_syscall(
            address_domain, storage_address_from_base_and_offset(base, 0_u8), value.x.into()
        )?;
        storage_write_syscall(
            address_domain, storage_address_from_base_and_offset(base, 1_u8), value.y.into()
        )
    }
}


#[contract]
mod ERC721 {
    use array::ArrayTrait;
    use option::OptionTrait;
    use starknet::contract_address;
    use starknet::ContractAddress;
    use starknet::get_caller_address;
    use starknet::get_contract_address;
    use traits::Into;
    use traits::TryInto;
    use zeroable::Zeroable;
    use starknet::contract_address::Felt252TryIntoContractAddress;

    use eternum::utils::unpack::unpack_realms_data;
    use super::Position;
    use super::Pos2DStorageAccess;
    use super::RealmData;

    use dojo_core::storage::query::Query;
    use dojo_core::storage::query::QueryTrait;
    use dojo_core::storage::query::LiteralIntoQuery;

    use dojo_core::interfaces::IWorldDispatcher;
    use dojo_core::interfaces::IWorldDispatcherTrait;

    use super::super::components::Balance;
    use super::super::components::Owner;
    use super::super::components::TokenApproval;

    use debug::PrintTrait;

    #[event]
    fn Transfer(from: ContractAddress, to: ContractAddress, token_id: felt252) {}

    #[event]
    fn Approval(owner: ContractAddress, approved: ContractAddress, token_id: felt252) {}

    struct Storage {
        _world: ContractAddress,
        _name: felt252,
        _symbol: felt252,
        _total_supply: felt252,
        _realm_data: LegacyMap<felt252, u256>,
        _realm_name: LegacyMap<felt252, u256>,
        _realm_position: LegacyMap<felt252, Position>,
    }

    //
    // Constructor
    //

    #[constructor]
    fn constructor(world_addr: ContractAddress, token_name: felt252, token_symbol: felt252) {
        _world::write(world_addr);
        _name::write(token_name);
        _symbol::write(token_symbol);
    }

    //
    // ERC721Metadata
    //

    #[view]
    fn name(realm_id: felt252) -> felt252 {
        _name::read()
    }

    #[view]
    fn symbol() -> felt252 {
        _symbol::read()
    }

    //
    // Realm specific metadata
    //

    #[view]
    fn realm_name(realm_id: felt252) -> u256 {
        _realm_name::read(realm_id)
    }

    #[view]
    fn realm_position(realm_id: felt252) -> Position {
        _realm_position::read(realm_id)
    }

    #[view]
    fn fetch_realm_data(realm_id: felt252) -> RealmData {
        let realms_data_packed = _realm_data::read(realm_id);
        let realms_data = unpack_realms_data(realms_data_packed);
        // TODO: need to refactor this, should not use u256 but u8
        return RealmData {
            realm_id: realm_id,
            regions: (*realms_data[0]).low.into().try_into().unwrap(),
            cities: (*realms_data[1]).low.into().try_into().unwrap(),
            harbors: (*realms_data[2]).low.into().try_into().unwrap(),
            rivers: (*realms_data[3]).low.into().try_into().unwrap(),
            resource_ids_count: (*realms_data[4]).low.into().try_into().unwrap(),
            resource_ids_packed_low: *realms_data[5].low,
            resource_ids_packed_high: *realms_data[5].high,
            wonder: (*realms_data[6]).low.into().try_into().unwrap(),
            order: (*realms_data[7]).low.into().try_into().unwrap(),
        };
    }

    // TODO: should this be a system ?
    #[external]
    fn set_realm_data(
        realm_id: felt252, realm_data: u256, realm_name: u256, realm_position: Position
    ) {
        //TODO: assert only owner
        _realm_data::write(realm_id, realm_data);
        _realm_name::write(realm_id, realm_name);
        _realm_position::write(realm_id, realm_position);
    }

    //
    // ERC721
    //

    #[external]
    fn transfer_from(from: ContractAddress, to: ContractAddress, token_id: felt252) {
        transfer(from, to, token_id);
    }

    #[external]
    fn approve(approved: ContractAddress, token_id: felt252) {
        let owner = owner(token_id);
        assert(owner != approved, 'approval to owner');

        let token: felt252 = get_contract_address().into();
        let caller = get_caller_address();
        assert(caller == owner, 'not approved');

        let mut calldata = ArrayTrait::new();
        calldata.append(token);
        calldata.append(approved.into());
        calldata.append(token_id);
        world().execute('ERC721Approve'.into(), calldata.span());

        Approval(owner, approved, token_id);
    }

    //
    // NFT mint / burn
    //

    #[external]
    fn mint(to: ContractAddress) {
        assert(to.is_non_zero(), 'minting to zero address');
        // TODO: assert can mint

        let token = get_contract_address();
        let token_id = _total_supply::read() + 1;
        _total_supply::write(token_id);
        let mut calldata = ArrayTrait::<felt252>::new();
        calldata.append(token.into());
        calldata.append(to.into());
        calldata.append(token_id);
        world().execute('ERC721Mint'.into(), calldata.span());

        Transfer(Zeroable::zero(), to, token_id);
    }

    //
    // Internal
    //

    // NOTE: temporary, until we have inline commands outside of systems
    fn world() -> IWorldDispatcher {
        IWorldDispatcher { contract_address: _world::read() }
    }

    // fn assert_approved_or_owner(owner: ContractAddress, operator: ContractAddress, token_id: felt252) {
    //     let approved = commands::<TokenApproval>::entity((get_contract_address().into(), token_id).into());
    //     assert(
    //         operator == owner | operator == approved.address,
    //         'operation not allowed'
    //     );
    // }

    fn assert_valid_address(address: ContractAddress) {
        assert(address.is_non_zero(), 'invalid address');
    }

    #[inline(always)]
    fn owner(token: felt252) -> ContractAddress {
        let owner = world().entity('Owner'.into(), get_contract_address().into(), 0_u8, 0_usize);
        (*owner[0]).try_into().unwrap()
    }

    fn transfer(from: ContractAddress, to: ContractAddress, token_id: felt252) {
        let token = get_contract_address();
        let owner = owner(token_id);

        assert(owner == from, 'source not owner');
        assert(to.is_non_zero(), 'transferring to zero');

        let mut calldata = ArrayTrait::new();
        calldata.append(token.into());
        calldata.append(from.into());
        calldata.append(to.into());
        calldata.append(token_id);
        world().execute('ERC721TransferFrom'.into(), calldata.span());

        Transfer(from, to, token_id);
    }
}