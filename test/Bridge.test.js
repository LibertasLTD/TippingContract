const { expectEvent, time, expectRevert, BN, ether, constants } = require('@openzeppelin/test-helpers')
const { ZERO_ADDRESS } = constants
const { expect } = require('chai')
const { toWei, fromWei } = require('web3-utils')
const ZERO = new BN('0');
require('chai').should();

const Bridge = artifacts.require('Bridge');
const LibertasToken = artifacts.require('LibertasToken');
const BridgedStandardERC20 = artifacts.require('BridgedStandardERC20');
const IBridgedStandardERC20 = artifacts.require('IBridgedStandardERC20');
const MockContract = artifacts.require('MockContract');
const MockToken = artifacts.require('MockToken');
const IERC20 = artifacts.require('IERC20');

contract('Bridge', async (accounts) => {

  const owner = accounts[0];
  const alice = accounts[1];
  const bob = accounts[2];

  let bridgedStandartERC20;
  let bridge1;
  let bridge2;
  let libertas;
  let mock;
  let mockToken;

  beforeEach(async () => {
    bridgedStandartERC20 = await BridgedStandardERC20.new({ from: owner });
    libertas = await LibertasToken.new({ from: owner });
    await libertas.configure(owner);
    bridge1 = await Bridge.new(true, ZERO_ADDRESS, owner, libertas.address, "", "", { from: owner });
    bridge2 = await Bridge.new(false, bridgedStandartERC20.address, owner, libertas.address, "LIBERTAS", "LIBS", { from: owner });
    await bridgedStandartERC20.configure(
      bridge2.address,
      libertas.address,
      "LIBERTAS On End",
      "LOE"
    );
    mock = await MockContract.new();
    mockToken = await MockToken.new("Mock Token", "MT", ether('100'), { from: owner });
  });

  describe('non ERC20 standard functionality in BridgedStandardERC20', () => {

    it('should get name and symbol', async () => {
        expect(await bridgedStandartERC20.name()).to.be.equal("LIBERTAS On End");
        expect(await bridgedStandartERC20.symbol()).to.be.equal("LOE");

        const tokenAtEnd = await IBridgedStandardERC20.at(await bridge2.getEndTokenByStartToken(libertas.address));
        expect(await tokenAtEnd.name()).to.be.equal("LIBERTAS");
        expect(await tokenAtEnd.symbol()).to.be.equal("LIBS");
    });

    it('should burn if transfer to zero', async () => {
      const tokensToBridge = new BN('10');
      await bridge2.performBridgingToEnd(libertas.address, alice, tokensToBridge, "", "");
      const tokenAtEnd = await IBridgedStandardERC20.at(await bridge2.getEndTokenByStartToken(libertas.address));
      await tokenAtEnd.transfer(ZERO_ADDRESS, tokensToBridge, { from: alice });
      expect(await tokenAtEnd.burnt()).to.be.bignumber.equal(tokensToBridge);
    });

    it('should transfer safely if recipient is not zero address', async () => {
      const tokensToBridge = new BN('10');
      await bridge2.performBridgingToEnd(libertas.address, alice, tokensToBridge, "", "");
      const tokenAtEnd = await IBridgedStandardERC20.at(await bridge2.getEndTokenByStartToken(libertas.address));
      await tokenAtEnd.approve(bob, tokensToBridge, { from: alice });
      await tokenAtEnd.transfer(bob, tokensToBridge, { from: alice });
      expect(await tokenAtEnd.balanceOf(bob)).to.be.bignumber.equal(tokensToBridge);
    });

  });

  it('should set new admin', async () => {
    await bridge2.setAdmin(bob, { from: owner });
    const adminRole = "0x00";
    expect(await bridge2.hasRole(adminRole, bob)).to.be.true;
  });

  it('should evacuate tokens', async () => {
    await expectRevert(bridge1.evacuateTokens(libertas.address, ZERO, ZERO_ADDRESS, { from: alice }), 'onlyAdmin');
    await expectRevert(bridge1.evacuateTokens(libertas.address, ZERO, ZERO_ADDRESS), 'cannotEvacuateAllowedToken');
    const amountToEvac = ether('1');
    await mockToken.approve(bridge1.address, amountToEvac);
    await mockToken.transfer(bridge1.address, amountToEvac);
    await bridge1.evacuateTokens(mockToken.address, amountToEvac, alice, { from: owner });
    expect(await mockToken.balanceOf(alice)).to.be.bignumber.equal(amountToEvac);
  });

  it('should set allowed token', async () => {
    await expectRevert(bridge1.setAllowedToken(mockToken.address, true, { from: alice }), 'onlyAdmin');
    await bridge1.setAllowedToken(mockToken.address, true, { from: owner });
    expect(await bridge1.allowedTokens(mockToken.address)).to.be.true;
  });

  it('should request bridging to end', async () => {
    const tokensToBridge = new BN('10');
    await libertas.approve(bridge1.address, tokensToBridge, { from: owner });
    await expectRevert(bridge1.requestBridgingToEnd(ZERO_ADDRESS, owner, tokensToBridge, { from: alice }), "invalidToken");
    const receipt = await bridge1.requestBridgingToEnd(libertas.address, alice, tokensToBridge);
    expectEvent(receipt, "RequestBridgingToEnd", {
      _tokenAtStart: libertas.address,
      _from: owner,
      _to: alice,
      _amount: tokensToBridge
    });
    expect(await libertas.balanceOf(bridge1.address)).to.be.bignumber.equal(tokensToBridge);
  });

  it('should request bridging to start', async () => {
    const tokensToBridge = new BN('10');
    const tokenAtEnd = await IBridgedStandardERC20.at(await bridge2.getEndTokenByStartToken(libertas.address));
    await bridge2.performBridgingToEnd(libertas.address, alice, tokensToBridge, "", "");

    await tokenAtEnd.approve(bridge2.address, tokensToBridge, { from: alice });
    await expectRevert(bridge2.requestBridgingToStart(libertas.address, ZERO_ADDRESS, owner, tokensToBridge, { from: alice }), "invalidToken");
    const receipt = await bridge2.requestBridgingToStart(libertas.address, tokenAtEnd.address, owner, tokensToBridge, { from: alice });
    expectEvent(receipt, "RequestBridgingToStart", {
      _tokenAtEnd: tokenAtEnd.address,
      _from: alice,
      _to: owner,
      _amount: tokensToBridge
    });
    expect(await tokenAtEnd.balanceOf(alice)).to.be.bignumber.equal(ZERO);
  });

  it('should keep directions safe', async () => {
    await expectRevert(bridge2.requestBridgingToEnd(mock.address, ZERO_ADDRESS, ZERO), "onlyAtStart");
    await expectRevert(bridge1.requestBridgingToStart(mock.address, mock.address, ZERO_ADDRESS, ZERO), "onlyAtEnd");
    await expectRevert(bridge1.performBridgingToEnd(mock.address, ZERO_ADDRESS, ZERO, "", ""), "onlyAtEnd");
    await expectRevert(bridge2.performBridgingToStart(ZERO_ADDRESS, mock.address, ZERO_ADDRESS, ZERO), "onlyAtStart");
  });

  it('should create token at end if non exists', async () => {
    const tokensToBridge = new BN('10');
    await mockToken.approve(bridge1.address, tokensToBridge, { from: owner });
    await bridge1.setAllowedToken(mockToken.address, true, { from: owner });
    await bridge1.requestBridgingToEnd(mockToken.address, alice, tokensToBridge, { from: owner });
    await bridge2.performBridgingToEnd(mockToken.address, alice, tokensToBridge, "", "", { from: owner });
    const tokenAtEndAddress = await bridge2.getEndTokenByStartToken(mockToken.address);
    expect(tokenAtEndAddress).to.not.be.equal(ZERO_ADDRESS);
  });

  it('should perform bridging from start to end and backwards', async () => {
    const tokensToBridge = new BN('10');

    await libertas.approve(bridge1.address, tokensToBridge, { from: owner });
    await bridge1.requestBridgingToEnd(libertas.address, alice, tokensToBridge, { from: owner });
    const receipt1 = await bridge2.performBridgingToEnd(libertas.address, alice, tokensToBridge, "", "", { from: owner });

    const tokenAtEnd = await IBridgedStandardERC20.at(await bridge2.getEndTokenByStartToken(libertas.address));
    const tokenAtStart = await IBridgedStandardERC20.at(await bridge2.getStartTokenByEndToken(tokenAtEnd.address));

    expect(tokenAtStart.address).to.be.equal(libertas.address);

    await tokenAtEnd.approve(bridge2.address, tokensToBridge, { from: alice });
    await bridge2.requestBridgingToStart(libertas.address, tokenAtEnd.address, owner, tokensToBridge, { from: alice });
    const receipt2 = await bridge1.performBridgingToStart(tokenAtStart.address, tokenAtEnd.address, owner, tokensToBridge, { from: owner });

    expect(receipt1, "BridgingToEndPerformed", {
      _tokenAtStart: tokenAtStart.address,
      _tokenAtEnd: tokenAtEnd.address,
      _to: owner,
      _amount: tokensToBridge
    });

  });

  it('should get end token by start token', async () => {
    const tokenAtEndAddress = await bridge2.getEndTokenByStartToken(libertas.address);
    expect(tokenAtEndAddress).to.not.be.equal(ZERO_ADDRESS);
  });

  it('should revert if no start token provided', async () => {
    await expectRevert(bridge2.getStartTokenByEndToken(ZERO_ADDRESS), "noStartTokenFound");
  });

  it('should not mint or burn called not by bridge', async () => {
    const tokenAtEnd = await IBridgedStandardERC20.at(await bridge2.getEndTokenByStartToken(libertas.address));
    await expectRevert(tokenAtEnd.mint(ZERO_ADDRESS, ZERO), "onlyBridge");
    await expectRevert(tokenAtEnd.burn(ZERO_ADDRESS, ZERO), "onlyBridge");
  });

  it('should revert if perform bridging called not by message bot', async () => {
    await expectRevert(bridge1.performBridgingToStart(ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS, ZERO, { from: alice }), "onlyMessangerBot");
    await expectRevert(bridge2.performBridgingToEnd(ZERO_ADDRESS, ZERO_ADDRESS, ZERO, "", "", { from: alice }), "onlyMessangerBot");
  });

});
