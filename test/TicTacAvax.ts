import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers'
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { expect } from 'chai'
import { Contract, ZeroAddress } from 'ethers'
import hre, { ethers } from 'hardhat'

describe('Tic Tac Avax', function () {
	async function deployFixture() {
		const [santiago, leonardo, juan] = await hre.ethers.getSigners()

		const TicTacAvax = await ethers.getContractFactory('TicTacAvax')
		const ticTacAvax = await TicTacAvax.deploy()

		return {
			santiago,
			leonardo,
			juan,
			ticTacAvax
		}
	}

	describe('Start game', () => {
		let ticTacAvax: Contract,
			santiago: HardhatEthersSigner,
			leonardo: HardhatEthersSigner,
			juan: HardhatEthersSigner

		before(async () => {
			const fixture = await loadFixture(deployFixture)
			ticTacAvax = fixture.ticTacAvax
			santiago = fixture.santiago
			leonardo = fixture.leonardo
			juan = fixture.juan
		})

		it('Should revert if the game is started by zero address', async () => {
			await expect(
				ticTacAvax.connect(santiago).startGame(ZeroAddress, leonardo.address)
			).to.be.revertedWith('Invalid player')
		})

		it('Should revert if the game is started by same player', async () => {
			await expect(
				ticTacAvax
					.connect(santiago)
					.startGame(santiago.address, santiago.address)
			).to.be.revertedWith('Players must be different')
		})

		it('Should start the game', async () => {
			await expect(
				ticTacAvax
					.connect(santiago)
					.startGame(santiago.address, leonardo.address)
			)
				.to.emit(ticTacAvax, 'GameStarted')
				.withArgs(santiago.address, leonardo.address)
		})

		it('Should revert if the game is already started', async () => {
			await expect(
				ticTacAvax.connect(santiago).startGame(juan.address, leonardo.address)
			).to.be.revertedWith('Game already started')
		})

		describe('Variables', () => {
			it('Should return the players', async () => {
				const playerOne = await ticTacAvax.players(0)
				const playerTwo = await ticTacAvax.players(1)
				expect([playerOne, playerTwo]).to.eql([
					santiago.address,
					leonardo.address
				])
			})

			it('Should return the current player', async () => {
				const currentPlayer = await ticTacAvax.currentPlayer()
				expect(currentPlayer).to.equal(0)
			})

			it('Should return the board', async () => {
				const board = [
					[
						Number(await ticTacAvax.board(0, 0)),
						Number(await ticTacAvax.board(0, 1)),
						Number(await ticTacAvax.board(0, 2))
					],
					[
						Number(await ticTacAvax.board(1, 0)),
						Number(await ticTacAvax.board(1, 1)),
						Number(await ticTacAvax.board(1, 2))
					],
					[
						Number(await ticTacAvax.board(2, 0)),
						Number(await ticTacAvax.board(2, 1)),
						Number(await ticTacAvax.board(2, 2))
					]
				]
				expect(board).to.eql([
					[0, 0, 0],
					[0, 0, 0],
					[0, 0, 0]
				])
			})

			it('Should return the game round count', async () => {
				const round = await ticTacAvax.roundCount()
				expect(round).to.equal(1)
			})

			it('Should return the game status', async () => {
				const status = await ticTacAvax.gameOver()
				// eslint-disable-next-line @typescript-eslint/no-unused-expressions
				expect(status).to.be.false
			})

			it('Should return last move timestamp', async () => {
				const timestamp = await ticTacAvax.lastMoveTimestamp()
				expect(timestamp).to.be.not.equal(0)
			})
		})
	})

	describe('Play', () => {
		let ticTacAvax: Contract,
			santiago: HardhatEthersSigner,
			leonardo: HardhatEthersSigner,
			juan: HardhatEthersSigner

		before(async () => {
			const fixture = await loadFixture(deployFixture)
			ticTacAvax = fixture.ticTacAvax
			santiago = fixture.santiago
			leonardo = fixture.leonardo
			juan = fixture.juan

			await ticTacAvax
				.connect(santiago)
				.startGame(santiago.address, leonardo.address)
		})

		describe('only player', () => {
			it('Should revert if a non-player tries to make a move', async () => {
				await expect(
					ticTacAvax.connect(juan).makeMove(0, 0)
				).to.be.revertedWith('Not a player')
			})
		})

		describe('invalid move', () => {
			it('Should revert if the player tries to make a invalid move', async () => {
				await expect(
					ticTacAvax.connect(santiago).makeMove(4, 0)
				).to.be.revertedWith('Invalid move')
			})
		})

		it('Should revert if the player tries to make a move when it is not his turn', async () => {
			await expect(
				ticTacAvax.connect(leonardo).makeMove(0, 0)
			).to.be.revertedWith('Not your turn')
		})

		it('Should make a move', async () => {
			await expect(ticTacAvax.connect(santiago).makeMove(0, 0))
				.to.emit(ticTacAvax, 'MoveMade')
				.withArgs(santiago.address, 0, 0)
		})

		describe('Win game', () => {
			it('Should emit GameWon event with the correct winner', async () => {
				await ticTacAvax.connect(leonardo).makeMove(0, 1)
				await ticTacAvax.connect(santiago).makeMove(1, 0)
				await ticTacAvax.connect(leonardo).makeMove(1, 1)

				await expect(
					ticTacAvax.connect(santiago).makeMove(1, 1)
				).to.be.revertedWith('Cell already taken')

				await expect(ticTacAvax.connect(santiago).makeMove(2, 0))
					.to.emit(ticTacAvax, 'GameWon')
					.withArgs(santiago.address)

				const status = await ticTacAvax.gameOver()
				expect(status).to.be.true
			})

			it('Should revert if the game is already over', async () => {
				await expect(
					ticTacAvax.connect(leonardo).makeMove(2, 1)
				).to.be.revertedWith('Game over')
			})
		})

		describe('Draw game', async () => {
			await ticTacAvax
				.connect(santiago)
				.startGame(santiago.address, leonardo.address)

			it('Should emit GameDraw event', async () => {
				// Realizamos movimientos para forzar un empate
				await ticTacAvax.connect(santiago).makeMove(0, 0) // X
				await ticTacAvax.connect(leonardo).makeMove(0, 1) // O
				await ticTacAvax.connect(santiago).makeMove(0, 2) // X
				await ticTacAvax.connect(leonardo).makeMove(1, 0) // O
				await ticTacAvax.connect(santiago).makeMove(1, 1) // X
				await ticTacAvax.connect(leonardo).makeMove(1, 2) // O
				await ticTacAvax.connect(santiago).makeMove(2, 1) // X
				await ticTacAvax.connect(leonardo).makeMove(2, 0) // O

				// El siguiente movimiento fuerza un empate
				await expect(ticTacAvax.connect(santiago).makeMove(2, 2)).to.emit(
					ticTacAvax,
					'GameDraw'
				)

				// Verificamos que el estado del juego esté terminado
				const status = await ticTacAvax.gameOver()
				expect(status).to.be.true
			})
		})
	})

	describe('Reset game', () => {
		let ticTacAvax: Contract,
			santiago: HardhatEthersSigner,
			leonardo: HardhatEthersSigner,
			juan: HardhatEthersSigner

		before(async () => {
			const fixture = await loadFixture(deployFixture)
			ticTacAvax = fixture.ticTacAvax
			santiago = fixture.santiago
			leonardo = fixture.leonardo
			juan = fixture.juan

			await ticTacAvax
				.connect(santiago)
				.startGame(santiago.address, leonardo.address)
		})

		it('Should reset the game after a win', async () => {
			// Realizamos movimientos para ganar el juego
			await ticTacAvax.connect(santiago).makeMove(0, 0) // X
			await ticTacAvax.connect(leonardo).makeMove(0, 1) // O
			await ticTacAvax.connect(santiago).makeMove(1, 0) // X
			await ticTacAvax.connect(leonardo).makeMove(1, 1) // O
			await ticTacAvax.connect(santiago).makeMove(2, 0) // X

			// Verificamos que el juego haya terminado
			const status = await ticTacAvax.gameOver()
			expect(status).to.be.true

			// Reiniciamos el juego
			await ticTacAvax.resetGame()

			// Verificamos que el tablero esté vacío
			const board = [
				[
					Number(await ticTacAvax.board(0, 0)),
					Number(await ticTacAvax.board(0, 1)),
					Number(await ticTacAvax.board(0, 2))
				],
				[
					Number(await ticTacAvax.board(1, 0)),
					Number(await ticTacAvax.board(1, 1)),
					Number(await ticTacAvax.board(1, 2))
				],
				[
					Number(await ticTacAvax.board(2, 0)),
					Number(await ticTacAvax.board(2, 1)),
					Number(await ticTacAvax.board(2, 2))
				]
			]
			expect(board).to.eql([
				[0, 0, 0],
				[0, 0, 0],
				[0, 0, 0]
			])
		})

		it('Should reset the game after a draw', async () => {
			await ticTacAvax
				.connect(santiago)
				.startGame(santiago.address, leonardo.address)

			await ticTacAvax.connect(santiago).makeMove(0, 0) // X
			await ticTacAvax.connect(leonardo).makeMove(0, 1) // O
			await ticTacAvax.connect(santiago).makeMove(0, 2) // X
			await ticTacAvax.connect(leonardo).makeMove(1, 1) // O
			await ticTacAvax.connect(santiago).makeMove(1, 0) // X
			await ticTacAvax.connect(leonardo).makeMove(2, 0) // O
			await ticTacAvax.connect(santiago).makeMove(1, 2) // X
			await ticTacAvax.connect(leonardo).makeMove(2, 2) // O

			await expect(await ticTacAvax.connect(santiago).makeMove(2, 1)).to.emit(
				ticTacAvax,
				'GameDraw'
			)

			let status = await ticTacAvax.gameOver()
			expect(status).to.be.true

			await ticTacAvax.resetGame()

			const board = [
				[
					Number(await ticTacAvax.board(0, 0)),
					Number(await ticTacAvax.board(0, 1)),
					Number(await ticTacAvax.board(0, 2))
				],
				[
					Number(await ticTacAvax.board(1, 0)),
					Number(await ticTacAvax.board(1, 1)),
					Number(await ticTacAvax.board(1, 2))
				],
				[
					Number(await ticTacAvax.board(2, 0)),
					Number(await ticTacAvax.board(2, 1)),
					Number(await ticTacAvax.board(2, 2))
				]
			]
			expect(board).to.eql([
				[0, 0, 0],
				[0, 0, 0],
				[0, 0, 0]
			])

			status = await ticTacAvax.gameOver()
			expect(status).to.be.false
		})

		it('Should revert if trying to reset the game before game over or 24 hours', async () => {
			await ticTacAvax
				.connect(santiago)
				.startGame(santiago.address, leonardo.address)

			await ticTacAvax.connect(santiago).makeMove(0, 0) // X

			// Intentamos resetear el juego antes de que el juego termine o pasen 24 horas
			await expect(ticTacAvax.resetGame()).to.be.revertedWith(
				'Game is not over yet or 24 hours have not passed'
			)
		})

		it('Should reset the game after 24 hours', async () => {
			await hre.network.provider.send('evm_increaseTime', [86400])
			await hre.network.provider.send('evm_mine')

			await ticTacAvax.resetGame()

			const board = [
				[
					Number(await ticTacAvax.board(0, 0)),
					Number(await ticTacAvax.board(0, 1)),
					Number(await ticTacAvax.board(0, 2))
				],
				[
					Number(await ticTacAvax.board(1, 0)),
					Number(await ticTacAvax.board(1, 1)),
					Number(await ticTacAvax.board(1, 2))
				],
				[
					Number(await ticTacAvax.board(2, 0)),
					Number(await ticTacAvax.board(2, 1)),
					Number(await ticTacAvax.board(2, 2))
				]
			]

			expect(board).to.eql([
				[0, 0, 0],
				[0, 0, 0],
				[0, 0, 0]
			])
		})
	})

	describe('Board', () => {
		let ticTacAvax: Contract,
			santiago: HardhatEthersSigner,
			leonardo: HardhatEthersSigner

		before(async () => {
			const fixture = await loadFixture(deployFixture)
			ticTacAvax = fixture.ticTacAvax
			santiago = fixture.santiago
			leonardo = fixture.leonardo

			await ticTacAvax
				.connect(santiago)
				.startGame(santiago.address, leonardo.address)
		})

		it('Should get the board', async () => {
			await ticTacAvax.connect(santiago).makeMove(0, 0)
			await ticTacAvax.connect(leonardo).makeMove(0, 1)
			await ticTacAvax.connect(santiago).makeMove(1, 0)
			await ticTacAvax.connect(leonardo).makeMove(1, 1)
			await ticTacAvax.connect(santiago).makeMove(2, 0)

			const board = (await ticTacAvax.getBoard()).map(row =>
				row.map(cell => Number(cell))
			)

			expect(board).to.eql([
				[1, 2, 0],
				[1, 2, 0],
				[1, 0, 0]
			])
		})
	})
})
