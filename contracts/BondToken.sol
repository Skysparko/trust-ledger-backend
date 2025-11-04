// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title BondToken
 * @dev ERC20 token representing bonds for an investment opportunity
 * Each bond represents ownership in a specific investment opportunity
 */
contract BondToken is ERC20, Ownable, Pausable {
    // Investment opportunity metadata
    string public opportunityId; // UUID of the investment opportunity
    uint256 public maturityDate; // Unix timestamp when bonds mature
    uint256 public couponRate; // Annual interest rate in basis points (e.g., 500 = 5%)
    uint256 public bondPrice; // Price per bond in wei (e.g., 100e18 = 100 tokens)
    
    // Bond lifecycle
    bool public isActive;
    uint256 public totalBondsIssued;
    
    // Events
    event BondsMinted(address indexed to, uint256 amount, string indexed opportunityId);
    event BondsBurned(address indexed from, uint256 amount, string indexed opportunityId);
    event CouponPaid(address indexed to, uint256 amount, string indexed opportunityId);
    
    constructor(
        string memory _name,
        string memory _symbol,
        string memory _opportunityId,
        uint256 _maturityDate,
        uint256 _couponRate,
        uint256 _bondPrice,
        address _owner
    ) ERC20(_name, _symbol) Ownable(_owner) {
        opportunityId = _opportunityId;
        maturityDate = _maturityDate;
        couponRate = _couponRate;
        bondPrice = _bondPrice;
        isActive = true;
        totalBondsIssued = 0;
    }
    
    /**
     * @dev Mint bonds to a specific address
     * @param to Address to mint bonds to
     * @param amount Number of bonds to mint
     */
    function mint(address to, uint256 amount) external onlyOwner whenNotPaused {
        require(isActive, "Bond issuance is not active");
        require(to != address(0), "Cannot mint to zero address");
        
        totalBondsIssued += amount;
        _mint(to, amount * bondPrice);
        
        emit BondsMinted(to, amount, opportunityId);
    }
    
    /**
     * @dev Burn bonds from a specific address
     * @param from Address to burn bonds from
     * @param amount Number of bonds to burn
     */
    function burn(address from, uint256 amount) external onlyOwner {
        require(from != address(0), "Cannot burn from zero address");
        
        totalBondsIssued -= amount;
        _burn(from, amount * bondPrice);
        
        emit BondsBurned(from, amount, opportunityId);
    }
    
    /**
     * @dev Pay coupon to bond holders
     * @param recipients Array of addresses to pay coupons to
     * @param amounts Array of coupon amounts (in wei) for each recipient
     */
    function payCoupon(address[] memory recipients, uint256[] memory amounts) external onlyOwner {
        require(recipients.length == amounts.length, "Arrays length mismatch");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            if (recipients[i] != address(0) && amounts[i] > 0) {
                _mint(recipients[i], amounts[i]);
                emit CouponPaid(recipients[i], amounts[i], opportunityId);
            }
        }
    }
    
    /**
     * @dev Deactivate bond issuance
     */
    function deactivate() external onlyOwner {
        isActive = false;
    }
    
    /**
     * @dev Activate bond issuance
     */
    function activate() external onlyOwner {
        isActive = true;
    }
    
    /**
     * @dev Pause all token transfers
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause token transfers
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Get number of bonds held by an address
     * @param account Address to check
     * @return Number of bonds (token balance divided by bond price)
     */
    function getBondBalance(address account) external view returns (uint256) {
        return balanceOf(account) / bondPrice;
    }
    
    /**
     * @dev Override transfer to add custom logic if needed
     */
    function transfer(address to, uint256 amount) public override whenNotPaused returns (bool) {
        return super.transfer(to, amount);
    }
    
    /**
     * @dev Override transferFrom to add custom logic if needed
     */
    function transferFrom(address from, address to, uint256 amount) public override whenNotPaused returns (bool) {
        return super.transferFrom(from, to, amount);
    }
}

