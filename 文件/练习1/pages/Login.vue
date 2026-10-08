<script setup lang="ts">
import request from '@/utils/request';
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';


interface LoginForm{
    username:string
    password:string
}

const loginForm=reactive<LoginForm>({
    username:'',
    password:''
})

const router=useRouter()
const loading=ref(false)
const error=ref('')

const handleLogin=async()=>{
    loading.value=true
    error.value=''
    try{
        const res=await request.post<{
            ok:boolean,
            msg:string,
            token?:string
        }>(
            '/login',
            loginForm
        )

        if(res.ok){
            if(res.token) localStorage.setItem('token',res.token)
            router.push('/')
        }else{
            error.value=res.msg
        }

    }catch(err){
        error.value='登陆失败'+(err as Error).message
    }finally{
        loading.value=false
    }
}

</script>

<template>
    <div class="login_container">
        <form class="login_form" @submit.prevent="handleLogin">
            <h2>hello</h2>
            <div class="login_username">
                <span>用户名：</span>
                <input type="text" v-model="loginForm.username" required placeholder="请输入用户名"/>
            </div>

            <div class="login_password">
                <span>密码：</span>
                <input type="password" v-model="loginForm.password" required placeholder="请输入密码"/>
            </div>

            <div class="login_submit">
                <button type="submit" :disabled="loading">{{ loading?'登录中...':'登录' }}</button>
            </div>

            <p v-if="error" class="login_error">
                {{ error }}
            </p>
        </form>
    </div>
</template>

<style scoped>
.login_container {
    width: 100%;
    height: 100vh;
    background: url('../assets/爱莉希雅4K.png') no-repeat;
    background-size: cover;
}

.login_form {
    width: 80%;
    top: 30vh;
    position: relative;
}

.login_password {
    width: 80%;
}
</style>