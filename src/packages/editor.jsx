import { computed, defineComponent, inject, onMounted, ref } from "vue";
import '@/packages/editor.scss'
import EditorBlock from './editor-block'
import deepcopy from "deepcopy";
import { useMenuDragger } from "./useMenuDragger";
import { useFocus } from "./useFocus";
import { useBlockDragger } from "./useBlockDragger";
import { useCommand } from "./useCommand";
import { $dialog } from "@/components/Dialog";
import { $dropdown, DropdownItem } from "@/components/Dropdown";
import { ElButton } from "element-plus";
import EditorOperator from "./editor-operator";
export default defineComponent({
    props: {
        modelValue: { type: Object },
        formData: { type: Object }
    },
    emits: ['update:modelValue'],//触发的事件
    setup(props, ctx) {
        // 预览的时候 内容不能再操作了 可以点击 输入内容 方便看效果
        const previewRef = ref(false)
        const editorRef = ref(true)


        const data = computed({
            get() {
                return props.modelValue
            },
            set(newValue) {
                ctx.emit('update:modelValue', deepcopy(newValue))
            }
        })
        const containerStyles = computed(() => ({
            width: data.value.container.width + 'px',
            height: data.value.container.height + 'px',
        }))
        const config = inject('config')

        const containerRef = ref(null)

        // 1.实现菜单拖拽功能
        const { dragstart, dragend } = useMenuDragger(containerRef, data)

        // 2.实现获取焦点 选中后可以直接进行拖拽
        let { blockMousedown, focusData, containerMousedown, lastSelectBlock, clearBlockFocus } = useFocus(data, previewRef, (e) => {
            // 获取焦点后进行拖拽
            mousedown(e)
        })

        // 2.实现组件拖拽
        let { mousedown, markLine } = useBlockDragger(focusData, lastSelectBlock, data);
        // 3.实现拖拽多个元素的功能

        const { commands } = useCommand(data, focusData)

        const buttons = [
            { label: '撤销', handler: () => commands.undo() },
            { label: '重做', handler: () => commands.redo() },
            {
                label: '导出', handler: () => {
                    $dialog({
                        title: '导出json使用',
                        content: JSON.stringify(data.value),
                    })
                }
            },
            {
                label: '导入', handler: () => {
                    $dialog({
                        title: '导入json使用',
                        content: '',
                        footer: true,
                        onConfirm(text) {
                            commands.updateContainer(JSON.parse(text))
                        }
                    })
                }
            },
            { label: '置顶', handler: () => commands.placeTop() },
            { label: '置底', handler: () => commands.placeBottom() },
            { label: '删除', handler: () => commands.delete() },
            {
                label: () => previewRef.value ? '编辑' : '预览', handler: () => {
                    previewRef.value = !previewRef.value;
                    clearBlockFocus()
                }
            },
            {
                label: '关闭', handler: () => {
                    editorRef.value = false
                    clearBlockFocus()
                }
            }
        ];
        const onContextMenuBlock = (e, block) => {
            e.preventDefault()

            $dropdown({
                el: e.target, //以哪个元素为准产生一个dropdown
                content: () => {
                    return <>
                        <DropdownItem label="删除" onClick={() => commands.delete()}></DropdownItem>
                        <DropdownItem label="置顶" onClick={() => commands.placeTop()}></DropdownItem>
                        <DropdownItem label="置底" onClick={() => commands.placeBottom()}></DropdownItem>
                        <DropdownItem label="查看" onClick={() => {
                            $dialog({
                                title: '查看节点数据',
                                content: JSON.stringify(block)
                            })
                        }}></DropdownItem>
                        <DropdownItem label="导入" onClick={() => {
                            $dialog({
                                title: '导入节点数据',
                                content: '',
                                footer: true,
                                onConfirm(text) {
                                    text = JSON.parse(text);
                                    commands.updateBlock(text, block)
                                }
                            })
                        }}></DropdownItem>
                    </>
                }
            })
        }


        return () => !editorRef.value ? <>
            <div
                class="editor-container-canvas__content"
                style={containerStyles.value}
                style="margin:0"
            >
                {
                    (data.value.blocks.map((block, index) => (

                        <EditorBlock
                            class='editor-block-preview'
                            block={block}
                            formData={props.formData}

                        ></EditorBlock>
                    )))
                }
            </div>
            <div><ElButton type="primary" onClick={() => editorRef.value = true}>继续编辑</ElButton>{JSON.stringify(props.formData)}</div>
        </> :

            <div class="editor">
                <div class="editor-left">
                    {/* 根据注册列表渲染里面的内容 实现h5的拖拽*/}
                    {config.componentList.map(component => (
                        <div class="editor-left-item"
                            draggable
                            onDragstart={e => dragstart(e, component)}
                            onDragEnd={dragend}>
                            <span>{component.label}</span>
                            <span>{component.preview()}</span>
                        </div>
                    ))}
                </div>
                <div className="editor-top">
                    {buttons.map((btn, index) => {
                        const label = typeof btn.label == 'function' ? btn.label() : btn.label
                        return <div class="editor-top-button" onClick={btn.handler}>
                            <span>{label}</span>
                        </div>
                    })}
                </div>
                <div className="editor-right">
                    <EditorOperator
                        block={lastSelectBlock.value}
                        data={data.value}
                        updateContainer={commands.updateContainer}
                        updateBlock={commands.updateBlock}
                    ></EditorOperator>
                </div>
                <div className="editor-container">
                    {/* 负责产生滚动条 */}
                    <div className="editor-container-canvas">
                        {/* 产生内容区域 */}
                        <div
                            class="editor-container-canvas__content"
                            style={containerStyles.value}
                            ref={containerRef}
                            onMousedown={containerMousedown}
                        >
                            {
                                (data.value.blocks.map((block, index) => (

                                    <EditorBlock
                                        class={block.focus ? 'editor-block-focus' : ''}
                                        class={previewRef.value ? 'editor-block-preview' : ''}
                                        block={block}
                                        formData={props.formData}
                                        onMousedown={(e) => blockMousedown(e, block, index)}
                                        onContextmenu={(e) => onContextMenuBlock(e, block)}>

                                    </EditorBlock>
                                )))
                            }


                            {markLine.x !== null && <div class="line-x" style={{ left: markLine.x + 'px' }}></div>}
                            {markLine.y !== null && <div class="line-y" style={{ top: markLine.y + 'px' }}></div>}
                        </div>

                    </div>
                </div>
            </div>
    }
})