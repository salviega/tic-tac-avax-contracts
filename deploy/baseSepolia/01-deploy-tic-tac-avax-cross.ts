import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction, DeployResult } from 'hardhat-deploy/dist/types'

import { developmentChains, networkConfig } from '../../helper-hardhat-config'
import { verify } from '../../helpers/verify'

const deployTicTacAvaxCross: DeployFunction = async function (
	hre: HardhatRuntimeEnvironment
) {
	const { getNamedAccounts, deployments, network } = hre
	const { log, deploy } = deployments
	const { deployer } = await getNamedAccounts()

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const args: any[] = [
		'0xe432150cce91c13a887f7D836923d5597adD8E31', // gateway
		'0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6' // gasService
	]

	log('-----------------------------------')
	log('Deploying Tic Tac Avax...')

	const ticTacAvaxDeployment: DeployResult = await deploy('TicTacAvaxCross', {
		from: deployer,
		args,
		log: true,
		waitConfirmations: networkConfig[network.name].blockConfirmations || 1
	})

	if (developmentChains.includes(network.name)) {
		await verify(ticTacAvaxDeployment.address, args)
	}
}

deployTicTacAvaxCross.tags = ['TictacAvaxCross', 'baseSepolia']
export default deployTicTacAvaxCross
