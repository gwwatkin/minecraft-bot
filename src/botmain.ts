
import {Bot} from "mineflayer";

import * as  botutils from './botutils'
import * as quarry from './quarry'
import * as strip_mine from './strip_mine'


const mineflayer = require('mineflayer')
const mineflayerViewer = require('prismarine-viewer').mineflayer
const autoeat = require('mineflayer-auto-eat')
const vec3 = require('vec3')

import MinecraftData = require('minecraft-data')

const { pathfinder, Movements, goals: { GoalNear }, movements } = require('mineflayer-pathfinder')




export class LittleHelper
{
    bot : Bot;
    stop : boolean;
    mcData : MinecraftData.IndexedData
    defaultMove : typeof Movements

    quarry_task? : quarry.QuarryTask

    constructor()
    {
        console.log("Logging in")
        this.bot = mineflayer.createBot({
            host: "localhost"//"3.230.142.29"
            ,port: 37659
        })

        this.bot.loadPlugin(pathfinder)
        this.bot.loadPlugin(autoeat)

        this.stop = false // Tell things to stop

        this.bot.once('spawn', () => {
            this.mcData = require('minecraft-data')(this.bot.version)
            this.defaultMove = new Movements(this.bot, this.mcData)

            // @ts-ignore
            this.bot.autoEat.options = {
                priority: 'foodPoints',
                startAt: 14,
                bannedFood: []
            }

            this.bot.on('chat', (username, message) => this.dispatchCommand(username,message))
        })


    }


    async dispatchCommand(username, message)
    {
        if (username === this.bot.username) return

        const argv = message.split(" ")
        const argn = argv.length
        const command = argv[0]

        switch (command) {
            case 'loaded':
                await this.bot.waitForChunksToLoad()
                this.bot.chat('Ready!')
                break
            case 'list':
            this.sayItems()
                break
            case 'dig':
                this.dig()
                break
            case 'build':
                this.build()
                break
            case 'equip':
                this.equipItem(argv[1])
                break
            case 'come':
                this.come(username, this.defaultMove)
                break
            case 'quarry':
                if (argn !== 3) {
                    this.bot.chat("Usage: quarry radius depth")
                    return
                }
                const radius = eval(argv[1])
                const depth = eval(argv[2])
                this.quarry(radius, depth)
                break
            case 'tunnel':
                const task = new strip_mine.TunnelTask({
                    'direction' : strip_mine.NORTH_DIRECTION
                },this)
                task.run()
                break
            case 'dump':
                await this.dump()
                break
            case 'stop':
                this.stop = true
                break
        }
    }


    sayItems (items = this.bot.inventory.items()) {
        const output = items.map(botutils.itemToString).join(', ')
        if (output) {
            this.bot.chat(output)
        } else {
            this.bot.chat('empty')
        }
    }

    dig () {
        let target
        if (this.bot.targetDigBlock) {
            this.bot.chat(`already digging ${this.bot.targetDigBlock.name}`)
        } else {
            target = this.bot.blockAt(this.bot.entity.position.offset(0, -1, 0))
            if (target && this.bot.canDigBlock(target)) {
                this.bot.chat(`starting to dig ${target.name}`)
                this.bot.dig(target, null,  botutils.onDiggingCompleted)
            } else {
                this.bot.chat('cannot dig')
            }
        }
    }

    build () {
        const referenceBlock = this.bot.blockAt(this.bot.entity.position.offset(0, -1, 0))
        const jumpY = Math.floor(this.bot.entity.position.y) + 1.0
        this.bot.setControlState('jump', true)
        this.bot.on('move', placeIfHighEnough)

        let tryCount = 0

        function placeIfHighEnough () {
            if (this.bot.entity.position.y > jumpY) {
                this.bot.placeBlock(referenceBlock, vec3(0, 1, 0), (err) => {
                    if (err) {
                        tryCount++
                        if (tryCount > 10) {
                            this.bot.chat(err.message)
                            this.bot.setControlState('jump', false)
                            this.bot.removeListener('move', placeIfHighEnough)
                            return
                        }
                        return
                    }
                    this.bot.setControlState('jump', false)
                    this.bot.removeListener('move', placeIfHighEnough)
                    this.bot.chat('Placing a block was successful')
                })
            }
        }
    }



    async equipItem(item_name)
    {
        let itemsByName
        if (this.bot.supportFeature('itemsAreNotBlocks')) {
            itemsByName = 'itemsByName'
        } else if (this.bot.supportFeature('itemsAreAlsoBlocks')) {
            itemsByName = 'blocksByName'
        }

        let equipped = true
        console.log(item_name)
        await this.bot.equip(this.mcData[itemsByName][item_name].id, 'hand', (err) => {
            if (err) {
                this.bot.chat(`unable to equip ${item_name}: ${err.message}`)
                equipped = false
            }
        })

        return equipped
    }


    come(username,moveMethod)
    {
        const target = this.bot.players[username]?.entity
        if (!target) {
            this.bot.chat("I don't see you !")
            return
        }

        this.bot.pathfinder.setMovements(moveMethod)
        this.bot.pathfinder.setGoal(botutils.make_goal_near(target.position))
    }

    quarry(radius : number ,depth : number)
    {
        this.quarry_task = new quarry.QuarryTask(
            {start_pos: this.bot.entity.position, radius: radius, depth: depth}, this)
        this.quarry_task.run()
    }

    async dump()
    {
        const items = this.bot.inventory.items() // get the items

        // dropper is a recursive function
        const dropper = (i) => {
            if (!items[i]) return // if we dropped all items, stop.
            this.bot.tossStack(items[i], () => dropper(i + 1)) // drop the item, then wait for a response from the server and drop another one.
        }
        dropper(0)
    }
}


const little_helper = new LittleHelper()
