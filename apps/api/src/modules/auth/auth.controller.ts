import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LogoutDto } from './dto/logout.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { limit: 5, ttl: 60 } })
  @Post('register')
  async register(@Body() dto: RegisterDto, @Req() req: any) {
    const tokens = await this.authService.register(dto.email, dto.password, dto.name, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
    return tokens;
  }

  @Throttle({ default: { limit: 8, ttl: 60 } })
  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: any) {
    const tokens = await this.authService.login(dto.email, dto.password, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
    return tokens;
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshDto, @Req() req: any) {
    const tokens = await this.authService.refresh(dto.refreshToken, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
    return tokens;
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Body() dto: LogoutDto) {
    return this.authService.logout(dto.refreshToken);
  }
}
