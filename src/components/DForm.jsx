import { useContainerDragger } from "@/packages/useContainerDragger";
import { ElForm } from "element-plus"
export default function DForm(props,size,border,children){
    console.log(children);
    const {mouseenter}=useContainerDragger()
    return(
        <>
            <ElForm label-width="auto" style={{height:size.height+'px',width:size.width+'px',border:border}} size={props.size}
             onDragEnter={e=>mouseenter(e)}>
                <el-form-item label="用户名" prop="name">
                  <el-input/>
                </el-form-item>
                <el-form-item label="密码" prop="password">
                  <el-input/>
                </el-form-item>
                <el-form-item>
                  <div class="dragArea" style={{width:size.width+'px'}}><span>可以将输入框拖拽到此处</span></div>
                </el-form-item>
                
            </ElForm>
        </>
    )
}