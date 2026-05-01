// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./interfaces/ILitSwapFactory.sol";
import "./interfaces/ILitSwapPair.sol";
import "./interfaces/ILitSwapRouter.sol";
import "./interfaces/IERC20.sol";
import "./libraries/LitSwapLibrary.sol";

contract LitSwapRouter is ILitSwapRouter {
    address public immutable override factory;
    address public immutable override WLTC;

    modifier ensure(uint256 deadline) {
        require(deadline >= block.timestamp, "LitSwapRouter: EXPIRED");
        _;
    }

    constructor(address _factory, address _WLTC) {
        factory = _factory;
        WLTC = _WLTC;
    }

    receive() external payable {
        assert(msg.sender == WLTC);
    }

    function _addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin
    ) internal returns (uint256 amountA, uint256 amountB) {
        if (ILitSwapFactory(factory).getPair(tokenA, tokenB) == address(0)) {
            ILitSwapFactory(factory).createPair(tokenA, tokenB);
        }
        (uint256 reserveA, uint256 reserveB) = LitSwapLibrary.getReserves(factory, tokenA, tokenB);
        if (reserveA == 0 && reserveB == 0) {
            (amountA, amountB) = (amountADesired, amountBDesired);
        } else {
            uint256 amountBOptimal = LitSwapLibrary.quote(amountADesired, reserveA, reserveB);
            if (amountBOptimal <= amountBDesired) {
                require(amountBOptimal >= amountBMin, "LitSwapRouter: INSUFFICIENT_B_AMOUNT");
                (amountA, amountB) = (amountADesired, amountBOptimal);
            } else {
                uint256 amountAOptimal = LitSwapLibrary.quote(amountBDesired, reserveB, reserveA);
                assert(amountAOptimal <= amountADesired);
                require(amountAOptimal >= amountAMin, "LitSwapRouter: INSUFFICIENT_A_AMOUNT");
                (amountA, amountB) = (amountAOptimal, amountBDesired);
            }
        }
    }

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external override ensure(deadline) returns (uint256 amountA, uint256 amountB, uint256 liquidity) {
        (amountA, amountB) = _addLiquidity(tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin);
        address pair = LitSwapLibrary.pairFor(factory, tokenA, tokenB);
        _safeTransferFrom(tokenA, msg.sender, pair, amountA);
        _safeTransferFrom(tokenB, msg.sender, pair, amountB);
        liquidity = ILitSwapPair(pair).mint(to);
    }

    function addLiquidityLTC(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountLTCMin,
        address to,
        uint256 deadline
    ) external payable override ensure(deadline) returns (uint256 amountToken, uint256 amountLTC, uint256 liquidity) {
        (amountToken, amountLTC) = _addLiquidity(
            token, WLTC, amountTokenDesired, msg.value, amountTokenMin, amountLTCMin
        );
        address pair = LitSwapLibrary.pairFor(factory, token, WLTC);
        _safeTransferFrom(token, msg.sender, pair, amountToken);
        IWLTC(WLTC).deposit{value: amountLTC}();
        assert(IWLTC(WLTC).transfer(pair, amountLTC));
        liquidity = ILitSwapPair(pair).mint(to);
        if (msg.value > amountLTC) {
            payable(msg.sender).transfer(msg.value - amountLTC);
        }
    }

    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) public override ensure(deadline) returns (uint256 amountA, uint256 amountB) {
        address pair = LitSwapLibrary.pairFor(factory, tokenA, tokenB);
        ILitSwapPair(pair).transferFrom(msg.sender, pair, liquidity);
        (uint256 amount0, uint256 amount1) = ILitSwapPair(pair).burn(to);
        (address token0,) = LitSwapLibrary.sortTokens(tokenA, tokenB);
        (amountA, amountB) = tokenA == token0 ? (amount0, amount1) : (amount1, amount0);
        require(amountA >= amountAMin, "LitSwapRouter: INSUFFICIENT_A_AMOUNT");
        require(amountB >= amountBMin, "LitSwapRouter: INSUFFICIENT_B_AMOUNT");
    }

    function removeLiquidityLTC(
        address token,
        uint256 liquidity,
        uint256 amountTokenMin,
        uint256 amountLTCMin,
        address to,
        uint256 deadline
    ) public override ensure(deadline) returns (uint256 amountToken, uint256 amountLTC) {
        (amountToken, amountLTC) =
            removeLiquidity(token, WLTC, liquidity, amountTokenMin, amountLTCMin, address(this), deadline);
        _safeTransfer(token, to, amountToken);
        IWLTC(WLTC).withdraw(amountLTC);
        payable(to).transfer(amountLTC);
    }

    function _swap(uint256[] memory amounts, address[] memory path, address _to) internal {
        for (uint256 i; i < path.length - 1; i++) {
            (address input, address output) = (path[i], path[i + 1]);
            (address token0,) = LitSwapLibrary.sortTokens(input, output);
            uint256 amountOut = amounts[i + 1];
            (uint256 amount0Out, uint256 amount1Out) =
                input == token0 ? (uint256(0), amountOut) : (amountOut, uint256(0));
            address to = i < path.length - 2 ? LitSwapLibrary.pairFor(factory, output, path[i + 2]) : _to;
            ILitSwapPair(LitSwapLibrary.pairFor(factory, input, output)).swap(amount0Out, amount1Out, to, new bytes(0));
        }
    }

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external override ensure(deadline) returns (uint256[] memory amounts) {
        amounts = LitSwapLibrary.getAmountsOut(factory, amountIn, path);
        require(amounts[amounts.length - 1] >= amountOutMin, "LitSwapRouter: INSUFFICIENT_OUTPUT_AMOUNT");
        _safeTransferFrom(path[0], msg.sender, LitSwapLibrary.pairFor(factory, path[0], path[1]), amounts[0]);
        _swap(amounts, path, to);
    }

    function swapTokensForExactTokens(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external override ensure(deadline) returns (uint256[] memory amounts) {
        amounts = LitSwapLibrary.getAmountsIn(factory, amountOut, path);
        require(amounts[0] <= amountInMax, "LitSwapRouter: EXCESSIVE_INPUT_AMOUNT");
        _safeTransferFrom(path[0], msg.sender, LitSwapLibrary.pairFor(factory, path[0], path[1]), amounts[0]);
        _swap(amounts, path, to);
    }

    function swapExactLTCForTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable override ensure(deadline) returns (uint256[] memory amounts) {
        require(path[0] == WLTC, "LitSwapRouter: INVALID_PATH");
        amounts = LitSwapLibrary.getAmountsOut(factory, msg.value, path);
        require(amounts[amounts.length - 1] >= amountOutMin, "LitSwapRouter: INSUFFICIENT_OUTPUT_AMOUNT");
        IWLTC(WLTC).deposit{value: amounts[0]}();
        assert(IWLTC(WLTC).transfer(LitSwapLibrary.pairFor(factory, path[0], path[1]), amounts[0]));
        _swap(amounts, path, to);
    }

    function swapTokensForExactLTC(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external override ensure(deadline) returns (uint256[] memory amounts) {
        require(path[path.length - 1] == WLTC, "LitSwapRouter: INVALID_PATH");
        amounts = LitSwapLibrary.getAmountsIn(factory, amountOut, path);
        require(amounts[0] <= amountInMax, "LitSwapRouter: EXCESSIVE_INPUT_AMOUNT");
        _safeTransferFrom(path[0], msg.sender, LitSwapLibrary.pairFor(factory, path[0], path[1]), amounts[0]);
        _swap(amounts, path, address(this));
        IWLTC(WLTC).withdraw(amounts[amounts.length - 1]);
        payable(to).transfer(amounts[amounts.length - 1]);
    }

    function swapExactTokensForLTC(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external override ensure(deadline) returns (uint256[] memory amounts) {
        require(path[path.length - 1] == WLTC, "LitSwapRouter: INVALID_PATH");
        amounts = LitSwapLibrary.getAmountsOut(factory, amountIn, path);
        require(amounts[amounts.length - 1] >= amountOutMin, "LitSwapRouter: INSUFFICIENT_OUTPUT_AMOUNT");
        _safeTransferFrom(path[0], msg.sender, LitSwapLibrary.pairFor(factory, path[0], path[1]), amounts[0]);
        _swap(amounts, path, address(this));
        IWLTC(WLTC).withdraw(amounts[amounts.length - 1]);
        payable(to).transfer(amounts[amounts.length - 1]);
    }

    function swapLTCForExactTokens(
        uint256 amountOut,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable override ensure(deadline) returns (uint256[] memory amounts) {
        require(path[0] == WLTC, "LitSwapRouter: INVALID_PATH");
        amounts = LitSwapLibrary.getAmountsIn(factory, amountOut, path);
        require(amounts[0] <= msg.value, "LitSwapRouter: EXCESSIVE_INPUT_AMOUNT");
        IWLTC(WLTC).deposit{value: amounts[0]}();
        assert(IWLTC(WLTC).transfer(LitSwapLibrary.pairFor(factory, path[0], path[1]), amounts[0]));
        _swap(amounts, path, to);
        if (msg.value > amounts[0]) {
            payable(msg.sender).transfer(msg.value - amounts[0]);
        }
    }

    function quote(
        uint256 amountA,
        uint256 reserveA,
        uint256 reserveB
    ) public pure override returns (uint256 amountB) {
        return LitSwapLibrary.quote(amountA, reserveA, reserveB);
    }

    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) public pure override returns (uint256 amountOut) {
        return LitSwapLibrary.getAmountOut(amountIn, reserveIn, reserveOut);
    }

    function getAmountIn(
        uint256 amountOut,
        uint256 reserveIn,
        uint256 reserveOut
    ) public pure override returns (uint256 amountIn) {
        return LitSwapLibrary.getAmountIn(amountOut, reserveIn, reserveOut);
    }

    function getAmountsOut(
        uint256 amountIn,
        address[] calldata path
    ) public view override returns (uint256[] memory amounts) {
        return LitSwapLibrary.getAmountsOut(factory, amountIn, path);
    }

    function getAmountsIn(
        uint256 amountOut,
        address[] calldata path
    ) public view override returns (uint256[] memory amounts) {
        return LitSwapLibrary.getAmountsIn(factory, amountOut, path);
    }

    function _safeTransfer(address token, address to, uint256 value) internal {
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(IERC20.transfer.selector, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), "LitSwapRouter: TRANSFER_FAILED");
    }

    function _safeTransferFrom(address token, address from, address to, uint256 value) internal {
        (bool success, bytes memory data) =
            token.call(abi.encodeWithSelector(IERC20.transferFrom.selector, from, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), "LitSwapRouter: TRANSFER_FROM_FAILED");
    }
}

interface IWLTC {
    function deposit() external payable;
    function transfer(address to, uint256 value) external returns (bool);
    function withdraw(uint256) external;
}
